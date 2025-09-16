import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarEvent } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  Clock,
  MapPin,
  User,
  Phone,
  Building,
  Users,
  X,
  Calendar as CalendarIcon,
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
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());

  // Check for upcoming events every minute
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const upcoming: UpcomingEvent[] = [];

      events.forEach(event => {
        if (event.status === 'scheduled' && !dismissedEvents.has(event.id)) {
          const eventDate = new Date(event.start_date);
          const minutesUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
          
          // Show notifications for events in the next 60 minutes
          if (minutesUntil > 0 && minutesUntil <= (event.reminder_minutes || 15)) {
            upcoming.push({
              ...event,
              minutesUntil,
            });
          }
        }
      });

      setUpcomingEvents(upcoming);
    };

    // Check immediately
    checkUpcomingEvents();

    // Then check every minute
    const interval = setInterval(checkUpcomingEvents, 60000);
    return () => clearInterval(interval);
  }, [events, dismissedEvents]);

  // Show toast notifications for imminent events
  useEffect(() => {
    upcomingEvents.forEach(event => {
      if (event.minutesUntil <= 5 && event.minutesUntil > 0) {
        const eventKey = `event-${event.id}-${event.minutesUntil}`;
        
        // Prevent duplicate notifications
        if (!localStorage.getItem(eventKey)) {
          localStorage.setItem(eventKey, 'shown');
          
          toast(`Appointment in ${event.minutesUntil} minute${event.minutesUntil > 1 ? 's' : ''}`, {
            description: `${event.title} ${event.location ? `at ${event.location}` : ''}`,
            action: {
              label: 'View',
              onClick: () => {
                // Navigate to event or open modal
                console.log('Navigate to event', event.id);
              },
            },
            duration: 10000,
          });
        }
      }
    });
  }, [upcomingEvents]);

  // Real-time updates via Supabase
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('calendar-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `agent_id=eq.${user.id}`,
        },
        (payload) => {
          // Handle real-time calendar updates
          if (payload.eventType === 'INSERT') {
            toast.success('New appointment scheduled', {
              description: payload.new?.title || 'A new appointment has been added to your calendar',
            });
          } else if (payload.eventType === 'UPDATE') {
            const event = payload.new as any;
            if (event?.status === 'cancelled') {
              toast.info('Appointment cancelled', {
                description: event.title || 'An appointment has been cancelled',
              });
            } else if (event?.status === 'rescheduled') {
              toast.info('Appointment rescheduled', {
                description: event.title || 'An appointment has been rescheduled',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getEventIcon = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'viewing': return <Building className="w-4 h-4" />;
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'follow-up': return <Clock className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'viewing': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'meeting': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'call': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'follow-up': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const handleDismiss = (eventId: string) => {
    setDismissedEvents(prev => new Set(prev).add(eventId));
  };

  const handleSnooze = (eventId: string) => {
    // Snooze for 10 minutes
    setDismissedEvents(prev => new Set(prev).add(eventId));
    setTimeout(() => {
      setDismissedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }, 10 * 60 * 1000);
  };

  if (upcomingEvents.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {upcomingEvents.map(event => (
        <Card key={event.id} className={`border shadow-lg ${getEventColor(event.event_type)}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 animate-pulse" />
                  <Badge variant="secondary" className="text-xs">
                    {event.minutesUntil}min
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  {getEventIcon(event.event_type)}
                  <span className="font-medium text-sm truncate">{event.title}</span>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.start_date).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  
                  {event.lead_name && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{event.lead_name}</span>
                    </div>
                  )}
                  
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDismiss(event.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-1"
                  onClick={() => handleSnooze(event.id)}
                >
                  10m
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => onEventUpdate(event.id, { status: 'completed' })}
              >
                Start
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  // Open event details
                  console.log('Open event details', event.id);
                }}
              >
                Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};