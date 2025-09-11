import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import type { Lead } from "@/types";
export type { Lead } from "@/types";

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('[LEADS] Fetching leads...');
      
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is an agent, only show their leads
      if (profile?.role === 'agent') {
        query = query.eq('agent_id', user?.id);
      }

      const { data, error } = await query;
      console.log('[LEADS] Query result:', { data: data?.length || 0, error });

      if (error) throw error;

      // Fetch profile data separately for each lead that has an agent_id
      const leadsWithProfiles = await Promise.all(
        (data || []).map(async (lead) => {
          if (lead.agent_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('user_id', lead.agent_id)
              .single();
            
            return {
              ...lead,
              profiles: profileData || null
            } as Lead;
          }
          return {
            ...lead,
            profiles: null
          } as Lead;
        })
      );

      console.log('[LEADS] Final data with profiles:', leadsWithProfiles.length);
      setLeads(leadsWithProfiles);
    } catch (error: any) {
      console.error('[LEADS] Error fetching leads:', error);
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
      console.log('[LEADS] Creating lead:', leadData);
      // Enforce rules: set agent_id to current user, omit null/empty source
      const payload: any = { ...leadData };
      // Always attribute to current user for RLS
      if (user?.id) payload.agent_id = user.id;
      // Handle source enum default: omit if empty or null
      if (payload.source == null || String(payload.source).trim() === '') {
        delete payload.source;
      }
      // Ensure email is at least empty string because DB column is not nullable
      if (payload.email == null) payload.email = '';
      if (payload.status == null) payload.status = 'new';

      const { data, error } = await supabase
        .from('leads')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      // Fetch the profile data separately if the lead has an agent_id
      let leadWithProfile = data;
      if (data?.agent_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', data.agent_id)
          .single();
        
        leadWithProfile = {
          ...data,
          profiles: profileData || null
        } as Lead;
      }

      console.log('[LEADS] Lead created successfully');
      setLeads(prev => [leadWithProfile as Lead, ...prev]);
      toast({
        title: 'Lead created',
        description: 'New lead has been added successfully.',
      });

      return { data: leadWithProfile, error: null };
    } catch (error: any) {
      console.error('[LEADS] Error creating lead:', error);
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

  const updateLead = async (id: string, updates: any) => {
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