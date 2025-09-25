import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types';

/**
 * Service for synchronizing data between Leads and Contacts
 */

export interface LeadContactSyncData {
  name: string;
  phone?: string;
  email: string;
  marketing_source?: string;
  notes?: string;
  status?: string;
  contact_status?: string;
}

/**
 * Sync shared fields from lead to contact when lead status changes to won/lost
 */
export async function syncLeadToContact(leadId: string): Promise<{ success: boolean; error?: any }> {
  try {
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;
    if (!lead) throw new Error('Lead not found');

    // Determine contact status based on lead status
    let contactStatus = 'lead';
    if (lead.status === 'won') {
      contactStatus = 'active_client';
    } else if (lead.status === 'lost') {
      contactStatus = 'past_client';
    }

    // Update lead with contact status
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        contact_status: contactStatus,
        status_effective: contactStatus === 'lead' ? 'active' : 'past',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Check if contact record exists
    const { data: existingContact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', lead.email)
      .maybeSingle();

    if (contactError && contactError.code !== 'PGRST116') throw contactError;

    const contactData = {
      full_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      marketing_source: lead.marketing_source,
      interest_tags: lead.interest_tags || [],
      status_effective: (contactStatus === 'lead' ? 'active' : 'past') as 'active' | 'past',
      status_mode: 'auto' as const,
      budget_min: null,
      budget_max: null,
      buyer_preferences: lead.buyer_preferences,
      tenant_preferences: lead.tenant_preferences,
      created_by: lead.agent_id,
      updated_at: new Date().toISOString()
    };

    if (existingContact) {
      // Update existing contact
      const { error: upsertError } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', existingContact.id);

      if (upsertError) throw upsertError;
    } else {
      // Create new contact
      const { error: insertError } = await supabase
        .from('contacts')
        .insert(contactData);

      if (insertError) throw insertError;
    }

    console.log(`Lead ${leadId} synced to contact with status: ${contactStatus}`);
    return { success: true };

  } catch (error) {
    console.error('Error syncing lead to contact:', error);
    return { success: false, error };
  }
}

/**
 * Bulk sync all leads that need contact status updates
 */
export async function bulkSyncLeadsToContacts(): Promise<{ processed: number; errors: number }> {
  try {
    // Get leads that need syncing (won/lost without proper contact_status)
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, status, contact_status')
      .in('status', ['won', 'lost'])
      .neq('contact_status', 'synced');

    if (error) throw error;

    let processed = 0;
    let errors = 0;

    for (const lead of leads || []) {
      const result = await syncLeadToContact(lead.id);
      if (result.success) {
        processed++;
      } else {
        errors++;
      }
    }

    console.log(`Bulk sync completed: ${processed} processed, ${errors} errors`);
    return { processed, errors };

  } catch (error) {
    console.error('Error in bulk sync:', error);
    return { processed: 0, errors: 1 };
  }
}

/**
 * Get leads that should appear in contacts list
 * (won/lost leads become contacts)
 */
export async function getLeadsAsContacts(userId: string): Promise<{ data: any[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        contact_status,
        created_at,
        updated_at,
        agent_id,
        marketing_source,
        interest_tags,
        profiles!leads_agent_id_fkey(name, email)
      `)
      .eq('agent_id', userId)
      .in('status', ['won', 'lost']);

    return { 
      data: data?.map(lead => ({
        ...lead,
        full_name: lead.name,
        status_effective: lead.status === 'won' ? 'active' : 'past'
      })) || [], 
      error 
    };

  } catch (error) {
    return { data: [], error };
  }
}