import { supabase } from "@/integrations/supabase/client";
import { ContactStatus } from "@/hooks/useContacts";

/**
 * Contact Master Hub Service
 * Enhanced contact service with status management, property relationships, and timeline
 */

// Re-export from leads service to avoid duplication
export { createLead as createContact } from '@/services/leads';
export { listLeads as listContacts } from '@/services/leads';
export { updateLead as updateContact } from '@/services/leads';
export { deleteLead as deleteContact } from '@/services/leads';

export type ContactPropertyRole = 'owner' | 'buyer_interest' | 'tenant' | 'investor';
export type ContactFileTag = 'id' | 'poa' | 'listing_agreement' | 'tenancy' | 'mou' | 'other';
export type ContactStatusMode = 'auto' | 'manual';
export type ContactStatusValue = 'active' | 'past';

export async function getContact(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      profiles!leads_agent_id_fkey(name, email)
    `)
    .eq("id", id)
    .single();

  return { data, error } as const;
}

export async function mergeContacts(primaryId: string, duplicateIds: string[]) {
  if (!duplicateIds.length) return { data: null, error: null };
  
  const { data, error } = await supabase
    .from('leads')
    .update({ merged_into_id: primaryId })
    .in('id', duplicateIds);
  
  return { data, error };
}

// Contact Status Management (Admin only)
export async function setContactStatusMode(contactId: string, mode: ContactStatusMode) {
  const { data, error } = await supabase
    .from('leads')
    .update({ status_mode: mode })
    .eq('id', contactId)
    .select()
    .single();

  if (!error && mode === 'auto') {
    // Trigger recomputation when switching to auto
    await recomputeContactStatus(contactId);
  }

  return { data, error };
}

export async function setContactManualStatus(contactId: string, status: ContactStatusValue) {
  const { data, error } = await supabase
    .from('leads')
    .update({ 
      status_manual: status,
      status_effective: status,
      status_mode: 'manual'
    })
    .eq('id', contactId)
    .select()
    .single();

  return { data, error };
}

export async function recomputeContactStatus(contactId: string) {
  const { data, error } = await supabase.rpc('recompute_contact_status', {
    p_contact_id: contactId,
    p_reason: 'manual_trigger'
  });

  return { data, error };
}

// Property Relationships
export async function linkPropertyToContact(params: {
  contactId: string;
  propertyId: string;
  role: ContactPropertyRole;
}) {
  const { data, error } = await supabase
    .from('contact_properties')
    .insert({
      contact_id: params.contactId,
      property_id: params.propertyId,
      role: params.role
    })
    .select()
    .single();

  return { data, error };
}

export async function unlinkPropertyFromContact(params: {
  contactId: string;
  propertyId: string;
  role: ContactPropertyRole;
}) {
  const { data, error } = await supabase
    .from('contact_properties')
    .delete()
    .eq('contact_id', params.contactId)
    .eq('property_id', params.propertyId)
    .eq('role', params.role);

  return { data, error };
}

export async function getContactProperties(contactId: string) {
  const { data, error } = await supabase
    .from('contact_properties')
    .select(`
      *,
      properties!inner(*)
    `)
    .eq('contact_id', contactId);

  return { data, error };
}

// Timeline
export async function getContactTimeline(contactId: string) {
  // Get status changes
  const { data: statusChanges } = await supabase
    .from('contact_status_changes')
    .select('*')
    .eq('contact_id', contactId);

  // Get activities
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', contactId);

  // Get file uploads
  const { data: files } = await supabase
    .from('contact_files')
    .select('*')
    .eq('contact_id', contactId);

  // Merge and sort timeline
  const timeline = [
    ...(statusChanges || []).map(item => ({
      id: item.id,
      type: 'status_change' as const,
      timestamp: item.created_at,
      title: `Status changed to ${item.new_status}`,
      subtitle: item.reason || '',
      data: item
    })),
    ...(activities || []).map(item => ({
      id: item.id,
      type: 'activity' as const,
      timestamp: item.created_at,
      title: item.description,
      subtitle: item.type,
      data: item
    })),
    ...(files || []).map(item => ({
      id: item.id,
      type: 'file_upload' as const,
      timestamp: item.created_at,
      title: `Uploaded ${item.name}`,
      subtitle: item.tag || 'document',
      data: item
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { data: timeline, error: null };
}

// File management with tags
export async function updateContactFileTag(fileId: string, tag: ContactFileTag) {
  const { data, error } = await supabase
    .from('contact_files')
    .update({ tag })
    .eq('id', fileId)
    .select()
    .single();

  return { data, error };
}