import { supabase } from '@/integrations/supabase/client';

/**
 * Get the least busy agent for round-robin assignment
 * Uses the existing database function for consistency
 */
export async function getLeastBusyAgent() {
  const { data, error } = await supabase.rpc('get_least_busy_agent');
  return { data, error };
}

/**
 * Auto-assign a contact to an agent using round-robin logic
 * This is handled automatically by the database trigger, but this function
 * can be used for manual assignment or re-assignment
 */
export async function assignContactToAgent(contactId: string, agentId?: string) {
  if (!agentId) {
    // Get least busy agent if none specified
    const { data: assignedAgentId, error: agentError } = await getLeastBusyAgent();
    if (agentError || !assignedAgentId) {
      return { data: null, error: agentError || new Error('No available agents') };
    }
    agentId = typeof assignedAgentId === 'string' ? assignedAgentId : assignedAgentId;
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ agent_id: agentId })
    .eq('id', contactId)
    .select()
    .single();

  return { data, error };
}

/**
 * Get agent statistics for load balancing
 */
export async function getAgentStatistics() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      user_id,
      name,
      email,
      status,
      leads!leads_agent_id_fkey(id, status)
    `)
    .eq('role', 'agent')
    .eq('status', 'active');

  if (error) return { data: null, error };

  // Calculate statistics
  const stats = data?.map(agent => ({
    agent_id: agent.user_id,
    name: agent.name,
    email: agent.email,
    total_leads: agent.leads?.length || 0,
    active_leads: agent.leads?.filter(lead => 
      !['won', 'lost'].includes(lead.status)
    ).length || 0,
  }));

  return { data: stats, error: null };
}