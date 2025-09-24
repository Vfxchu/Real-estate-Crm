import { supabase } from '@/integrations/supabase/client';

export interface AutoTaskData {
  leadId: string;
  agentId: string;
  contactName: string;
}

/**
 * Creates automatic tasks when a new lead is created
 * This ensures all leads get proper follow-up activities
 */
export async function createAutoLeadTasks({ leadId, agentId, contactName }: AutoTaskData) {
  try {
    const now = new Date();
    
    // Default tasks to create for new leads
    const tasks = [
      {
        title: 'Initial Call Back',
        event_type: 'lead_call' as const,
        start_date: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        lead_id: leadId,
        agent_id: agentId,
        created_by: agentId,
        description: `Initial contact call for ${contactName}`,
        reminder_offset_min: 5,
      },
      {
        title: 'Follow Up Call',
        event_type: 'lead_call' as const,
        start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        lead_id: leadId,
        agent_id: agentId,
        created_by: agentId,
        description: `Follow-up call for ${contactName}`,
        reminder_offset_min: 15,
      },
      {
        title: 'Schedule Meeting',
        event_type: 'contact_meeting' as const,
        start_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        lead_id: leadId,
        agent_id: agentId,
        created_by: agentId,
        description: `Schedule in-person meeting with ${contactName}`,
        reminder_offset_min: 30,
      },
    ];

    // Insert all tasks
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(tasks)
      .select();

    if (error) throw error;

    // Log activity for task creation
    await supabase
      .from('activities')
      .insert({
        type: 'system',
        description: `Auto-created ${tasks.length} follow-up tasks`,
        lead_id: leadId,
        created_by: agentId,
      });

    return { data, error: null };
  } catch (error: any) {
    console.error('Error creating auto tasks:', error);
    return { data: null, error };
  }
}

/**
 * Updates lead status and creates corresponding contact record
 * Ensures bidirectional sync between leads and contacts
 */
export async function syncLeadToContact(leadData: any) {
  try {
    // When a lead is created/updated, ensure there's a corresponding contact
    // This maintains the "All Leads are Contacts" business rule
    
    const contactData = {
      id: leadData.id, // Same ID for lead/contact relationship
      full_name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      marketing_source: leadData.source,
      status_effective: mapLeadStatusToContactStatus(leadData.status),
      created_by: leadData.agent_id || leadData.created_by,
      // Map other relevant fields
      budget_min: extractBudgetMin(leadData.budget_sale_band || leadData.budget_rent_band),
      budget_max: extractBudgetMax(leadData.budget_sale_band || leadData.budget_rent_band),
      buyer_preferences: leadData.segment === 'residential' && leadData.interest_tags?.includes('Buyer') ? {
        segment: leadData.segment,
        subtype: leadData.subtype,
        bedrooms: leadData.bedrooms,
        location: leadData.location_address
      } : null,
      tenant_preferences: leadData.segment === 'residential' && leadData.interest_tags?.includes('Tenant') ? {
        segment: leadData.segment,
        subtype: leadData.subtype,
        bedrooms: leadData.bedrooms,
        location: leadData.location_address
      } : null,
    };

    // Upsert contact record
    const { data, error } = await supabase
      .from('contacts')
      .upsert(contactData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error syncing lead to contact:', error);
    return { data: null, error };
  }
}

function mapLeadStatusToContactStatus(leadStatus: string): 'active' | 'past' {
  const activeStatuses = ['new', 'contacted', 'qualified', 'negotiating'];
  return activeStatuses.includes(leadStatus) ? 'active' : 'past';
}

function extractBudgetMin(budgetBand?: string): number | null {
  if (!budgetBand) return null;
  
  const match = budgetBand.match(/(\d+)/);
  return match ? parseInt(match[1]) * (budgetBand.includes('M') ? 1000000 : 1000) : null;
}

function extractBudgetMax(budgetBand?: string): number | null {
  if (!budgetBand) return null;
  if (budgetBand.includes('Above') || budgetBand.includes('above')) return null;
  
  const matches = budgetBand.match(/(\d+).*?(\d+)/);
  if (matches) {
    const multiplier = budgetBand.includes('M') ? 1000000 : 1000;
    return parseInt(matches[2]) * multiplier;
  }
  return null;
}

/**
 * Dispatches events to keep all parts of the application in sync
 */
export function dispatchSyncEvents(type: 'lead' | 'contact', action: 'created' | 'updated' | 'deleted', data: any) {
  // Dispatch events that other components can listen to
  window.dispatchEvent(new CustomEvent(`${type}s:${action}`, { detail: data }));
  
  // Cross-sync events
  if (type === 'lead') {
    window.dispatchEvent(new CustomEvent('contacts:updated', { detail: data }));
  }
  if (type === 'contact') {
    window.dispatchEvent(new CustomEvent('leads:changed', { detail: data }));
  }
  
  // Global refresh events
  window.dispatchEvent(new CustomEvent('activities:refresh'));
  window.dispatchEvent(new CustomEvent('calendar:refresh'));
  window.dispatchEvent(new CustomEvent('properties:refresh'));
}