import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  source: 'website' | 'referral' | 'social' | 'advertising' | 'cold_call' | 'email';
  agent_id?: string;
  interested_in?: string;
  budget_range?: string;
  follow_up_date?: string;
  notes?: string;
  score: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_agent_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // If user is an agent, only show their leads
      if (profile?.role === 'agent') {
        query = query.eq('agent_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLeads((data as Lead[]) || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching leads',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select(`
          *,
          profiles!leads_agent_id_fkey (
            name,
            email
          )
        `)
        .single();

      if (error) throw error;

      setLeads(prev => [data as Lead, ...prev]);
      toast({
        title: 'Lead created',
        description: 'New lead has been added successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error creating lead',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const upsertLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
    return createLead(leadData);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, ...(data as Lead) } : lead));
      toast({
        title: 'Lead updated',
        description: 'Lead has been updated successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error updating lead',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== id));
      toast({
        title: 'Lead deleted',
        description: 'Lead has been deleted successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error deleting lead',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const addActivity = async (leadId: string, type: string, description: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          lead_id: leadId,
          type,
          description,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast({
        title: 'Activity added',
        description: 'Activity has been logged successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error adding activity',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user, profile]);

  return {
    leads,
    loading,
    fetchLeads,
    createLead,
    upsertLead,
    updateLead,
    deleteLead,
    addActivity,
  };
};