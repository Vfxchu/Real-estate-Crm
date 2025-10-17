import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
      
      // Check for duplicates first (merge logic)
      const duplicateQuery = supabase.from('leads').select('*');
      if (leadData.email) {
        duplicateQuery.eq('email', leadData.email);
      } else if (leadData.phone) {
        duplicateQuery.eq('phone', leadData.phone);
      }
      
      const { data: existingLeads } = await duplicateQuery.limit(1);
      
      if (existingLeads && existingLeads.length > 0) {
        const existing = existingLeads[0];
        
        // Add activity noting the duplicate attempt
        await supabase.from('activities').insert({
          type: 'note',
          description: `Duplicate lead attempt merged - ${new Date().toLocaleString()}`,
          lead_id: existing.id,
          created_by: user?.id
        });
        
        toast({
          title: 'Duplicate lead merged',
          description: `This lead already exists and has been updated.`,
        });
        
        return { data: existing, error: null };
      }
      
      // Create new lead - agent assignment will be handled by DB trigger
      const leadToInsert: any = { ...leadData };
      delete leadToInsert.agent_id; // Let DB trigger assign agent
      
      const { data, error } = await supabase
        .from('leads')
        .insert(leadToInsert)
        .select(`
          *,
          profiles!leads_agent_id_fkey(name, email)
        `)
        .single();

      if (error) throw error;

      // Auto-create follow-up task for new lead (due in 1 hour)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && data) {
        const followUpTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(followUpTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        const { data: taskEvent, error: taskError } = await supabase
          .from('calendar_events')
          .insert({
            title: `Follow up with ${data.name}`,
            event_type: 'follow_up',
            start_date: followUpTime.toISOString(),
            end_date: endTime.toISOString(),
            lead_id: data.id,
            agent_id: data.agent_id || currentUser.id,
            created_by: currentUser.id,
            description: `Initial follow-up call for new lead: ${data.name}`,
            status: 'scheduled',
            reminder_minutes: 15,
            reminder_offset_min: 15
          })
          .select()
          .single();

        if (taskError) {
          console.error('Error creating follow-up task:', taskError);
        } else {
          // Log activity
          await supabase.from('activities').insert({
            type: 'task_created',
            description: `Auto-created follow-up task due at ${format(followUpTime, 'PPp')}`,
            lead_id: data.id,
            created_by: currentUser.id
          });
        }

        // Send notification to assigned agent if different from creator
        if (data.agent_id && data.agent_id !== currentUser.id) {
          try {
            const { sendLeadNotification } = await import('@/services/notification');
            await sendLeadNotification({
              agentId: data.agent_id,
              leadId: data.id,
              leadName: data.name,
              leadEmail: data.email,
              leadPhone: data.phone || undefined,
              notificationType: 'assignment'
            });
          } catch (notifError) {
            console.error('Error sending lead notification:', notifError);
            // Don't fail lead creation if notification fails
          }
        }
      }

      // Data already includes profile from service, no additional fetch needed
      const leadWithProfile = data;

      console.log('[LEADS] Lead created successfully with auto-follow-up task');
      setLeads(prev => [leadWithProfile as Lead, ...prev]);
      
      // Trigger sync events
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      window.dispatchEvent(new CustomEvent('leads:changed'));
      
      toast({
        title: 'Lead created',
        description: 'New lead has been added with automatic follow-up task.',
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
      console.log('[LEADS] Deleting lead:', id);
      
      // Optimistic update - remove from UI immediately
      const leadToDelete = leads.find(lead => lead.id === id);
      setLeads(prev => prev.filter(lead => lead.id !== id));

      // Perform deletion with proper error handling
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[LEADS] Delete error:', error);
        // Rollback optimistic update on error
        if (leadToDelete) {
          setLeads(prev => [...prev, leadToDelete]);
        }
        throw error;
      }

      console.log('[LEADS] Lead deleted successfully');
      
      // Trigger sync events
      window.dispatchEvent(new CustomEvent('leads:changed'));
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      
      toast({
        title: 'Lead deleted',
        description: 'Lead has been deleted successfully.',
      });

      return { error: null };
    } catch (error: any) {
      console.error('[LEADS] Error in deleteLead:', error);
      toast({
        title: 'Error deleting lead',
        description: error.message || 'Failed to delete lead. Please try again.',
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