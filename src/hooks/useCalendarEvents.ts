import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'viewing' | 'meeting' | 'call' | 'follow-up';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  start_date: string;
  end_date?: string;
  location?: string;
  notes?: string;
  agent_id: string;
  agent_name?: string;
  lead_id?: string;
  lead_name?: string;
  lead_email?: string;
  property_id?: string;
  property_title?: string;
  property_address?: string;
  deal_id?: string;
  deal_title?: string;
  reminder_minutes?: number;
  notification_sent?: boolean;
}

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_calendar_events_with_details', {
        start_date_param: startDate ? new Date(startDate).toISOString() : null,
        end_date_param: endDate ? new Date(endDate).toISOString() : null,
      });

      if (error) throw error;

      const formattedEvents: CalendarEvent[] = data.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        status: event.status,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        notes: event.notes,
        agent_id: event.agent_id,
        agent_name: event.agent_name,
        lead_id: event.lead_id,
        lead_name: event.lead_name,
        lead_email: event.lead_email,
        property_id: event.property_id,
        property_title: event.property_title,
        property_address: event.property_address,
        deal_id: event.deal_id,
        deal_title: event.deal_title,
        reminder_minutes: event.reminder_minutes,
        notification_sent: event.notification_sent,
      }));

      setEvents(formattedEvents);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: 'Error loading events',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          location: eventData.location,
          notes: eventData.notes,
          lead_id: eventData.lead_id,
          property_id: eventData.property_id,
          deal_id: eventData.deal_id,
          reminder_minutes: eventData.reminder_minutes || 15,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Event scheduled',
        description: 'New appointment has been added to calendar',
      });

      // Refresh events
      fetchEvents();
      return data;
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error creating event',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Event updated',
        description: 'Event has been successfully updated',
      });

      // Refresh events
      fetchEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: 'Event has been removed from calendar',
      });

      // Refresh events
      fetchEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};