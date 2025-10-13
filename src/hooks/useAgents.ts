import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { applyProfileMasking } from '@/utils/profilePermissions';
import { getCurrentUserRole } from '@/services/user-roles';

export interface Agent {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  assignedLeads: number;
  closedDeals: number;
  conversionRate: number;
  role?: string; // Optional: fetched from user_roles table
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchAgents = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin using the secure user_roles table
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();
      
      if (!userRole) {
        setAgents([]);
        return;
      }

      // Get current user's role for masking logic
      const currentUserRole = await getCurrentUserRole();

      // Fetch all agent user IDs from user_roles table
      const { data: agentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'agent');

      if (rolesError) throw rolesError;

      const agentUserIds = agentRoles?.map(r => r.user_id) || [];

      if (agentUserIds.length === 0) {
        setAgents([]);
        return;
      }

      // Fetch profiles for agents
      const { data: agentsData, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', agentUserIds)
        .order('name');

      if (error) throw error;

      // Apply masking to profiles based on permissions and fetch lead counts
      const agentsWithStats = await Promise.all(
        (agentsData || []).map(async (agent) => {
          // Apply profile masking for sensitive fields (email, phone)
          const maskedAgent = applyProfileMasking(agent, user?.id, currentUserRole);

          // Log admin access to other agents' profiles
          if (currentUserRole === 'admin' && agent.user_id !== user?.id) {
            // Audit logging will be done when sensitive fields are actually accessed
            await supabase.rpc('log_profile_access', {
              p_accessed_user_id: agent.user_id,
              p_accessed_name: agent.name,
              p_accessed_email: agent.email
            });
          }

          const { data: leads } = await supabase
            .from('leads')
            .select('status')
            .eq('agent_id', agent.user_id);

          const assignedLeads = leads?.filter(l => ['new', 'contacted', 'qualified', 'negotiating'].includes(l.status)).length || 0;
          const closedDeals = leads?.filter(l => l.status === 'won').length || 0;
          const conversionRate = assignedLeads > 0 ? Math.round((closedDeals / assignedLeads) * 100) : 0;

          return {
            ...maskedAgent,
            role: 'agent',
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
    if (user) {
      fetchAgents();
    }
  }, [user]);

  return {
    agents,
    loading,
    fetchAgents,
    updateAgent,
    deleteAgent,
  };
};