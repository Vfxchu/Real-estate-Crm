import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Agent {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  assignedLeads: number;
  closedDeals: number;
  conversionRate: number;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchAgents = async () => {
    try {
      setLoading(true);
      
      // Only admins can fetch all agents
      if (profile?.role !== 'admin') {
        setAgents([]);
        return;
      }

      const { data: agentsData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .order('name');

      if (error) throw error;

      // Fetch lead counts for each agent
      const agentsWithStats = await Promise.all(
        (agentsData || []).map(async (agent) => {
          const { data: leads } = await supabase
            .from('leads')
            .select('status')
            .eq('agent_id', agent.user_id);

          const assignedLeads = leads?.filter(l => ['new', 'contacted', 'qualified', 'negotiating'].includes(l.status)).length || 0;
          const closedDeals = leads?.filter(l => l.status === 'won').length || 0;
          const conversionRate = assignedLeads > 0 ? Math.round((closedDeals / assignedLeads) * 100) : 0;

          return {
            ...agent,
            assignedLeads,
            closedDeals,
            conversionRate,
          };
        })
      );

      setAgents(agentsWithStats as Agent[]);
    } catch (error: any) {
      toast({
        title: 'Error fetching agents',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAgent = async (userId: string, updates: Partial<Agent>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      setAgents(prev => prev.map(agent => 
        agent.user_id === userId ? { ...agent, ...updates } : agent
      ));

      toast({
        title: 'Agent updated',
        description: 'Agent information has been updated successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error updating agent',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteAgent = async (userId: string) => {
    try {
      // Update status to inactive instead of deleting
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('user_id', userId);

      if (error) throw error;

      setAgents(prev => prev.map(agent => 
        agent.user_id === userId ? { ...agent, status: 'inactive' as const } : agent
      ));

      toast({
        title: 'Agent deactivated',
        description: 'Agent has been deactivated successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error deactivating agent',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchAgents();
    }
  }, [user, profile]);

  return {
    agents,
    loading,
    fetchAgents,
    updateAgent,
    deleteAgent,
  };
};