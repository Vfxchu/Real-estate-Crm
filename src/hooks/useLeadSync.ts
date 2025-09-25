import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for syncing Lead ↔ Contact data across the system
 * Handles real-time updates and data consistency
 */
export function useLeadSync() {
  useEffect(() => {
    // Listen for lead status changes
    const leadStatusChannel = supabase
      .channel('lead-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: 'status=eq.won,status=eq.lost'
        },
        (payload) => {
          console.log('Lead status changed:', payload);
          
          // Dispatch events for other components to react
          if (payload.new.status === 'won') {
            window.dispatchEvent(new CustomEvent('lead:won', { 
              detail: { leadId: payload.new.id, contactStatus: 'active_client' }
            }));
          } else if (payload.new.status === 'lost') {
            window.dispatchEvent(new CustomEvent('lead:lost', { 
              detail: { leadId: payload.new.id, contactStatus: 'past_client' }
            }));
          }
        }
      )
      .subscribe();

    // Listen for contact status changes
    const contactStatusChannel = supabase
      .channel('contact-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_status_changes'
        },
        (payload) => {
          console.log('Contact status changed:', payload);
          
          // Dispatch refresh events
          window.dispatchEvent(new CustomEvent('contacts:updated'));
          window.dispatchEvent(new CustomEvent('leads:updated'));
        }
      )
      .subscribe();

    // Listen for new leads created
    const newLeadsChannel = supabase
      .channel('new-leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('New lead created:', payload);
          
          // Show notification for new lead
          toast({
            title: 'New Lead Created',
            description: `Lead "${payload.new.name}" has been assigned to you.`
          });
          
          // Dispatch refresh events
          window.dispatchEvent(new CustomEvent('leads:created'));
          window.dispatchEvent(new CustomEvent('activities:refresh'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadStatusChannel);
      supabase.removeChannel(contactStatusChannel);
      supabase.removeChannel(newLeadsChannel);
    };
  }, []);

  return null;
}