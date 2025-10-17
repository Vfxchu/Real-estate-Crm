import { supabase } from '@/integrations/supabase/client';

export interface Communication {
  id: string;
  lead_id?: string;
  contact_id?: string;
  agent_id: string;
  type: 'email' | 'whatsapp' | 'call' | 'sms' | 'meeting';
  subject?: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'inbound' | 'outbound';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Relations
  leads?: { name: string; email: string };
  contacts?: { full_name: string; email: string };
  profiles?: { name: string; email: string };
}

export interface CreateCommunicationData {
  lead_id?: string;
  contact_id?: string;
  type: Communication['type'];
  subject?: string;
  message: string;
  status?: Communication['status'];
  direction?: Communication['direction'];
  metadata?: Record<string, any>;
}

/**
 * Fetch communications with filters
 */
export async function fetchCommunications(filters?: {
  leadId?: string;
  contactId?: string;
  agentId?: string;
  type?: string;
  status?: string;
}) {
  let query = supabase
    .from('communications')
    .select(`
      *,
      leads(name, email),
      contacts(full_name, email),
      profiles:agent_id(name, email)
    `)
    .order('created_at', { ascending: false });

  if (filters?.leadId) {
    query = query.eq('lead_id', filters.leadId);
  }
  if (filters?.contactId) {
    query = query.eq('contact_id', filters.contactId);
  }
  if (filters?.agentId) {
    query = query.eq('agent_id', filters.agentId);
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as any[];
}

/**
 * Create a new communication record
 */
export async function createCommunication(data: CreateCommunicationData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: comm, error } = await supabase
    .from('communications')
    .insert({
      ...data,
      agent_id: user.id,
      status: data.status || 'sent',
      direction: data.direction || 'outbound',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity if linked to lead
  if (data.lead_id) {
    await supabase.from('activities').insert({
      type: `communication_${data.type}`,
      description: `${data.type.toUpperCase()}: ${data.subject || data.message.substring(0, 100)}`,
      lead_id: data.lead_id,
      created_by: user.id,
    });
  }

  return comm as Communication;
}

/**
 * Update communication status
 */
export async function updateCommunicationStatus(id: string, status: Communication['status']) {
  const { error } = await supabase
    .from('communications')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get communication statistics
 */
export async function getCommunicationStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('communications')
    .select('type, status')
    .eq('agent_id', user.id);

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    email: data?.filter(c => c.type === 'email').length || 0,
    whatsapp: data?.filter(c => c.type === 'whatsapp').length || 0,
    call: data?.filter(c => c.type === 'call').length || 0,
    sms: data?.filter(c => c.type === 'sms').length || 0,
    sent: data?.filter(c => c.status === 'sent').length || 0,
    delivered: data?.filter(c => c.status === 'delivered').length || 0,
    read: data?.filter(c => c.status === 'read').length || 0,
    failed: data?.filter(c => c.status === 'failed').length || 0,
  };

  return stats;
}
