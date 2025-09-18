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
      
      // PERFORMANCE FIX: Use JOIN instead of N+1 queries
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_agent_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      console.log('[LEADS] Query result:', { data: data?.length || 0, error });

      if (error) throw error;

      // Data is already joined, no need for additional queries
      const leadsWithProfiles = (data || []).map(lead => ({
        ...lead,
        profiles: lead.profiles || null
      })) as Lead[];

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
      
      // Use the enhanced lead creation service that handles contact sync
      const { createLead: serviceCreateLead } = await import('@/services/leads');
      const { data, error } = await serviceCreateLead(leadData as any);

      if (error) throw error;

      // Data already includes profile from service, no additional fetch needed
      const leadWithProfile = data;

      console.log('[LEADS] Lead created successfully and synced with contacts');
      setLeads(prev => [leadWithProfile as Lead, ...prev]);
      
      // Trigger sync events
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      window.dispatchEvent(new CustomEvent('leads:changed'));
      
      toast({
        title: 'Lead created',
        description: 'New lead has been added and synced with contacts.',
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
        .maybeSingle(); // SECURITY: Use maybeSingle to prevent errors

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

  const addActivity = async (leadId: string, type: string, description: string, propertyId?: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          lead_id: leadId,
          property_id: propertyId || null,
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