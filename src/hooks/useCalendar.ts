import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getUnreadNotifications,
  markNotificationAsRead,
  type CalendarEvent,
  type CreateCalendarEventPayload
} from '@/services/calendar';

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEvents = async (startDate?: string, endDate?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await getCalendarEvents(startDate, endDate);
      if (error) throw error;
      setEvents(data as CalendarEvent[]);
    } catch (error: any) {
      toast({
        title: 'Error fetching events',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: CreateCalendarEventPayload) => {
    try {
      const { data, error } = await createCalendarEvent(eventData);
      if (error) throw error;
      
      setEvents(prev => [...prev, data as CalendarEvent]);
      toast({
        title: 'Event created',
        description: 'Calendar event has been scheduled successfully',
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error creating event',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateEvent = async (id: string, updates: Partial<CreateCalendarEventPayload>) => {
    try {
      const { data, error } = await updateCalendarEvent(id, updates);
      if (error) throw error;
      
      setEvents(prev => prev.map(event => 
        event.id === id ? { ...event, ...updates } : event
      ));
      
      toast({
        title: 'Event updated',
        description: 'Calendar event has been updated successfully',
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await deleteCalendarEvent(id);
      if (error) throw error;
      
      setEvents(prev => prev.filter(event => event.id !== id));
      toast({
        title: 'Event deleted',
        description: 'Calendar event has been removed',
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await getUnreadNotifications();
      if (error) throw error;
      setNotifications(data);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await markNotificationAsRead(id);
      if (error) throw error;
      
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchEvents();
    fetchNotifications();

    // Set up real-time subscription for calendar events
    const eventSubscription = supabase
      .channel('calendar_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        () => {
          fetchEvents(); // Refetch events when changes occur
        }
      )
      .subscribe();

    // Set up real-time subscription for notifications
    const notificationSubscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast notification for important events
          if (newNotification.type === 'reminder' && newNotification.priority === 'high') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 10000, // 10 seconds for important reminders
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventSubscription);
      supabase.removeChannel(notificationSubscription);
    };
  }, [user]);

  // Check for upcoming notifications every minute
  useEffect(() => {
    const checkUpcomingNotifications = () => {
      const now = new Date();
      const upcomingNotifications = notifications.filter(notification => {
        if (!notification.scheduled_for) return false;
        const scheduledTime = new Date(notification.scheduled_for);
        const timeDiff = scheduledTime.getTime() - now.getTime();
        return timeDiff > 0 && timeDiff <= 60000; // Within the next minute
      });

      upcomingNotifications.forEach(notification => {
        toast({
          title: '🔔 Reminder',
          description: notification.message,
          duration: 15000, // 15 seconds
        });
        markAsRead(notification.id);
      });
    };

    const interval = setInterval(checkUpcomingNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [notifications]);

  return {
    events,
    notifications,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchNotifications,
    markAsRead,
  };
}

// Import supabase for real-time subscriptions
import { supabase } from '@/integrations/supabase/client';