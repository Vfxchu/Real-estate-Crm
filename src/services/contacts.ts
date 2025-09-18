import { supabase } from "@/integrations/supabase/client";
import { ContactStatus } from "@/hooks/useContacts";

/**
 * Contacts Service - Simplified wrapper around leads service
 * In this CRM system, leads ARE contacts. This service provides contact-specific
 * operations while maintaining data consistency with the leads table.
 */

// Re-export from leads service to avoid duplication
export { createLead as createContact } from '@/services/leads';
export { listLeads as listContacts } from '@/services/leads';
export { updateLead as updateContact } from '@/services/leads';
export { deleteLead as deleteContact } from '@/services/leads';

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