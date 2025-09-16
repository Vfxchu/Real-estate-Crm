import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarEvent } from '@/types';

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async (startDate?: string, endDate?: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Build query for calendar events
      let query = supabase
        .from('calendar_events')
        .select(`
          *,
          leads!calendar_events_lead_id_fkey(name, email),
          properties!calendar_events_property_id_fkey(title, address)
        `)
        .order('start_date', { ascending: true });

      if (startDate) {
        query = query.gte('start_date', new Date(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte('start_date', new Date(endDate).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedEvents: CalendarEvent[] = (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        status: event.status,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        notes: event.notes,
        lead_id: event.lead_id,
        property_id: event.property_id,
        contact_id: event.contact_id,
        deal_id: event.deal_id,
        agent_id: event.agent_id,
        created_by: event.created_by,
        created_at: event.created_at,
        updated_at: event.updated_at,
        reminder_minutes: event.reminder_minutes,
        notification_sent: event.notification_sent,
        is_recurring: event.is_recurring,
        recurrence_pattern: event.recurrence_pattern,
        recurrence_end_date: event.recurrence_end_date,
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

  const createEvent = async (eventData: Partial<CalendarEvent>): Promise<any> => {
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
          contact_id: eventData.contact_id,
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

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Auto-create activity when appointment is completed
      if (updates.status === 'completed') {
        const event = events.find(e => e.id === id);
        if (event && event.event_type === 'property_viewing') {
          try {
            await supabase
              .from('activities')
              .insert({
                type: 'meeting',
                description: `Completed property viewing: ${event.title}`,
                lead_id: event.lead_id,
                property_id: event.property_id,
                created_by: event.agent_id,
              });
          } catch (activityError) {
            console.error('Error creating activity for completed appointment:', activityError);
          }
        }
      }

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

  const deleteEvent = async (id: string): Promise<void> => {
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