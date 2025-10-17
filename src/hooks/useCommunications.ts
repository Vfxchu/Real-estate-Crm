import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchCommunications, 
  createCommunication, 
  getCommunicationStats,
  Communication,
  CreateCommunicationData 
} from '@/services/communications';
import { supabase } from '@/integrations/supabase/client';

export function useCommunications(filters?: {
  leadId?: string;
  contactId?: string;
  agentId?: string;
  type?: string;
  status?: string;
}) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    email: 0,
    whatsapp: 0,
    call: 0,
    sms: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCommunications = async () => {
    try {
      setLoading(true);
      const data = await fetchCommunications(filters);
      setCommunications(data);
    } catch (error: any) {
      console.error('Error loading communications:', error);
      toast({
        title: 'Error loading communications',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getCommunicationStats();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const sendMessage = async (data: CreateCommunicationData) => {
    try {
      await createCommunication(data);
      toast({
        title: 'Message sent',
        description: `${data.type} message sent successfully`,
      });
      await loadCommunications();
      await loadStats();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    loadCommunications();
    loadStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('communications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communications',
        },
        () => {
          loadCommunications();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters?.leadId, filters?.contactId, filters?.agentId, filters?.type, filters?.status]);

  return {
    communications,
    stats,
    loading,
    sendMessage,
    refresh: loadCommunications,
  };
}
