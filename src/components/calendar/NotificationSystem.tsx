import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Bell,
  Clock,
  CheckCircle,
  Building,
  Phone,
  Users,
  Calendar,
  X,
} from 'lucide-react';

interface NotificationSystemProps {
  events: CalendarEvent[];
  onEventUpdate: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
}

interface UpcomingEvent extends CalendarEvent {
  minutesUntil: number;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  events,
  onEventUpdate,
}) => {
  const { toast } = useToast();
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());

  // Check for upcoming events every minute
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const upcoming: UpcomingEvent[] = [];

      events.forEach((event) => {
        if (event.status !== 'scheduled' || !event.next_due_at) return;
        
        const dueTime = new Date(event.next_due_at);
        const minutesUntil = Math.floor((dueTime.getTime() - now.getTime()) / 1000 / 60);
        
        // Show events that are due within 15 minutes and not dismissed
        if (minutesUntil >= -2 && minutesUntil <= 15 && !dismissedEvents.has(event.id)) {
          upcoming.push({
            ...event,
            minutesUntil,
          });
        }
      });

      setUpcomingEvents(upcoming);
    };

    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [events, dismissedEvents]);

  // Show toast notifications for imminent events
  useEffect(() => {
    upcomingEvents.forEach((event) => {
      // Show toast for events due within 5 minutes
      if (event.minutesUntil <= 5 && event.minutesUntil >= 0) {
        const storageKey = `notification_${event.id}_${format(new Date(event.start_date), 'yyyy-MM-dd-HH-mm')}`;
        const lastNotified = sessionStorage.getItem(storageKey);
        
        // Don't show duplicate notifications within 10 minutes
        if (!lastNotified || Date.now() - parseInt(lastNotified) > 10 * 60 * 1000) {
          toast({
            title: `Upcoming: ${event.title}`,
            description: `Starting in ${event.minutesUntil} minute${event.minutesUntil !== 1 ? 's' : ''}`,
            duration: 8000,
          });
          sessionStorage.setItem(storageKey, Date.now().toString());
        }
      }
    });
  }, [upcomingEvents, toast]);

  // Real-time updates from Supabase
  useEffect(() => {
    const channel = supabase
      .channel('calendar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendar_events',
          filter: `agent_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`,
        },
        (payload) => {
          const newEvent = payload.new as CalendarEvent;
          toast({
            title: 'New Event Scheduled',
            description: `${newEvent.title} - ${format(new Date(newEvent.start_date), 'MMM d, h:mm a')}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calendar_events',
          filter: `agent_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`,
        },
        (payload) => {
          const updatedEvent = payload.new as CalendarEvent;
          const oldEvent = payload.old as CalendarEvent;
          
          // Notify about status changes
          if (oldEvent.status !== updatedEvent.status) {
            if (updatedEvent.status === 'cancelled') {
              toast({
                title: 'Event Cancelled',
                description: updatedEvent.title,
                variant: 'destructive',
              });
            } else if (updatedEvent.status === 'rescheduled') {
              toast({
                title: 'Event Rescheduled',
                description: `${updatedEvent.title} - ${format(new Date(updatedEvent.start_date), 'MMM d, h:mm a')}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getEventIcon = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'property_viewing': return <Building className="w-4 h-4" />;
      case 'contact_meeting': return <Users className="w-4 h-4" />;
      case 'lead_call': return <Phone className="w-4 h-4" />;
      case 'follow_up': return <Clock className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'property_viewing': return 'bg-green-100 text-green-800 border-green-200';
      case 'contact_meeting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lead_call': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'follow_up': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleMarkCompleted = async (eventId: string) => {
    try {
      await onEventUpdate(eventId, { status: 'completed' });
      setDismissedEvents(prev => new Set([...prev, eventId]));
      toast({
        title: 'Event Completed',
        description: 'Event has been marked as completed',
      });
    } catch (error) {
      console.error('Error marking event as completed:', error);
    }
  };

  const handleSnooze = async (eventId: string, minutes: number) => {
    try {
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
      await onEventUpdate(eventId, { snooze_until: snoozeUntil.toISOString() });
      setDismissedEvents(prev => new Set([...prev, eventId]));
      toast({
        title: 'Event Snoozed',
        description: `Reminder snoozed for ${minutes} minutes`,
      });
    } catch (error) {
      console.error('Error snoozing event:', error);
    }
  };

  const handleDismiss = (eventId: string) => {
    setDismissedEvents(prev => new Set([...prev, eventId]));
  };

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
      {upcomingEvents.map((event) => (
        <Card key={event.id} className={`border-l-4 ${getEventColor(event.event_type)} shadow-lg`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <CardTitle className="text-sm font-medium">
                  {event.minutesUntil <= 0 ? 'Starting Now!' : `In ${event.minutesUntil}m`}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(event.id)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getEventIcon(event.event_type)}
                <span className="font-medium text-sm">{event.title}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(event.start_date), 'h:mm a')}
                {event.location && (
                  <>
                    <span>•</span>
                    <span>{event.location}</span>
                  </>
                )}
              </div>

              <Badge variant="outline" className={`text-xs ${getEventColor(event.event_type)}`}>
                {event.event_type.replace('_', ' ')}
              </Badge>

              <div className="flex gap-1 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkCompleted(event.id)}
                  className="h-7 px-2 text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Done
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSnooze(event.id, 5)}
                  className="h-7 px-2 text-xs"
                >
                  +5m
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSnooze(event.id, 10)}
                  className="h-7 px-2 text-xs"
                >
                  +10m
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSnooze(event.id, 15)}
                  className="h-7 px-2 text-xs"
                >
                  +15m
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};