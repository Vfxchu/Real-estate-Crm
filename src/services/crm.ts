import { supabase } from '@/integrations/supabase/client';

export type CallOutcome = 'interested' | 'callback' | 'no_answer' | 'busy' | 'not_interested' | 'invalid' | 'other';

export interface CallOutcomeRequest {
  leadId: string;
  outcome: CallOutcome;
  notes?: string;
  callbackAt?: string;
}

/**
 * Log a call outcome for a lead and automatically create appropriate calendar events
 * Enhanced to handle business outcomes and status transitions
 */
export async function logOutcome(request: CallOutcomeRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Parse business outcome from notes if it's JSON
  let businessOutcome;
  let parsedNotes = request.notes;
  
  try {
    if (request.notes && request.notes.startsWith('{')) {
      const parsed = JSON.parse(request.notes);
      businessOutcome = parsed.business_outcome;
      parsedNotes = parsed.note || null;
    }
  } catch (e) {
    // If not JSON, treat as regular notes
  }

  // Handle status transitions based on business outcome
  if (businessOutcome) {
    let newStatus;
    switch (businessOutcome) {
      case 'interested':
      case 'meeting_scheduled':
        newStatus = 'qualified';
        break;
      case 'under_offer':
        newStatus = 'negotiating';
        break;
      case 'deal_won':
        newStatus = 'won';
        break;
      case 'deal_lost':
        newStatus = 'lost';
        break;
      // For invalid, status is handled via custom_fields in the dialog
    }

    if (newStatus) {
      await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', request.leadId);
    }
  }

  const { error } = await supabase.rpc('log_call_outcome', {
    p_lead_id: request.leadId,
    p_agent_id: user.id,
    p_outcome: request.outcome,
    p_notes: parsedNotes,
    p_callback_at: request.callbackAt || null
  });

  if (error) throw error;
}

/**
 * Run SLA sweep to reassign overdue leads
 */
export async function runSlaSweep(minutes = 30) {
  const { data, error } = await supabase.rpc('reassign_overdue_leads', {
    p_minutes: minutes
  });

  if (error) throw error;
  return data; // Number of leads reassigned
}

/**
 * Get call attempts for a lead
 */
export async function getCallAttempts(leadId: string) {
  const { data, error } = await supabase
    .from('call_attempts')
    .select(`
      *,
      profiles!call_attempts_agent_id_fkey(name, email)
    `)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get assignment history for a lead
 */
export async function getAssignmentHistory(leadId: string) {
  const { data, error } = await supabase
    .from('assignment_history')
    .select(`
      *,
      profiles!assignment_history_agent_id_fkey(name, email)
    `)
    .eq('lead_id', leadId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Calculate SLA status for a lead
 */
export function calculateSlaStatus(lead: any) {
  if (!lead.assigned_at || lead.first_outcome_at) {
    return null; // No SLA or already completed
  }

  const assignedAt = new Date(lead.assigned_at);
  const now = new Date();
  const elapsed = now.getTime() - assignedAt.getTime();
  const slaMinutes = 30;
  const slaMs = slaMinutes * 60 * 1000;

  const remaining = slaMs - elapsed;
  const isOverdue = remaining <= 0;

  return {
    isOverdue,
    remainingMs: remaining,
    remainingMinutes: Math.max(0, Math.floor(remaining / (60 * 1000))),
    elapsedMinutes: Math.floor(elapsed / (60 * 1000)),
    slaMinutes
  };
}

/**
 * Format call outcome for display
 */
export function formatCallOutcome(outcome: CallOutcome): string {
  const outcomeMap: Record<CallOutcome, string> = {
    interested: 'Interested',
    callback: 'Callback Requested',
    no_answer: 'No Answer',
    busy: 'Number Busy',
    not_interested: 'Not Interested',
    invalid: 'Invalid/Spam',
    other: 'Other'
  };
  return outcomeMap[outcome] || outcome;
}