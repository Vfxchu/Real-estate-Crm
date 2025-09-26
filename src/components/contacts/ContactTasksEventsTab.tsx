import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, Plus, Edit3, Check, X } from 'lucide-react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEvent } from '@/types';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CalendarEventForm } from '@/components/forms/CalendarEventForm';

interface ContactTasksEventsTabProps {
  contactId: string;
}

const getEventTypeIcon = (eventType: string) => {
  switch (eventType.toLowerCase()) {
    case 'property_viewing':
    case 'viewing':
      return MapPin;
    case 'meeting':
    case 'appointment':
      return Calendar;
    case 'call':
    case 'callback':
      return Clock;
    default:
      return Calendar;
  }
};

const getEventTypeLabel = (eventType: string) => {
  switch (eventType.toLowerCase()) {
    case 'property_viewing':
      return 'Property Viewing';
    case 'contact_meeting':
      return 'Client Meeting';
    case 'lead_call':
      return 'Follow-up Call';
    case 'callback':
      return 'Callback';
    default:
      return eventType;
  }
};

const getStatusVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    case 'scheduled':
      return 'secondary';
    case 'in_progress':
      return 'default';
    default:
      return 'outline';
  }
};

export default function ContactTasksEventsTab({ contactId }: ContactTasksEventsTabProps) {
  const { events, loading, fetchEvents, updateEvent, deleteEvent } = useCalendarEvents();
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const contactEvents = events.filter(event => 
    event.contact_id === contactId || event.lead_id === contactId
  );

  const handleStatusUpdate = async (eventId: string, newStatus: string) => {
    try {
      await updateEvent(eventId, { status: newStatus as CalendarEvent['status'] });
      setEditingEvent(null);
      // The hook automatically refreshes events after update
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const handleMarkComplete = async (eventId: string) => {
    await handleStatusUpdate(eventId, 'completed');
  };

  const handleMarkCancelled = async (eventId: string) => {
    await handleStatusUpdate(eventId, 'cancelled');
  };

  const formatEventDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy • h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const sortedEvents = contactEvents.sort((a, b) => {
    const dateA = new Date(a.start_date);
    const dateB = new Date(b.start_date);
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });

  const upcomingEvents = sortedEvents.filter(event => 
    isFuture(parseISO(event.start_date)) && event.status !== 'completed' && event.status !== 'cancelled'
  );
  
  const pastEvents = sortedEvents.filter(event => 
    isPast(parseISO(event.start_date)) || event.status === 'completed' || event.status === 'cancelled'
  );

  return (
    <div className="space-y-4">
      {/* Add New Event */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Tasks & Events</h3>
        <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Event</DialogTitle>
            </DialogHeader>
            <CalendarEventForm
              open={showNewEventDialog}
              onOpenChange={setShowNewEventDialog}
              onSuccess={() => {
                setShowNewEventDialog(false);
                fetchEvents();
              }}
              preselectedContact={contactId}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {upcomingEvents.map((event) => {
                  const Icon = getEventTypeIcon(event.event_type);
                  return (
                    <div key={event.id} className="border-b border-border/50 p-4 hover:bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getStatusVariant(event.status)} className="text-xs">
                                {getEventTypeLabel(event.event_type)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {event.status}
                              </Badge>
                            </div>
                            <h4 className="text-sm font-medium text-foreground mb-1">
                              {event.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-1">
                              {formatEventDateTime(event.start_date)}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground">
                                📍 {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {editingEvent === event.id ? (
                            <div className="flex items-center gap-1">
                              <Select
                                value={event.status}
                                onValueChange={(value) => handleStatusUpdate(event.id, value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingEvent(null)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingEvent(event.id)}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkComplete(event.id)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Past Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {pastEvents.map((event) => {
                  const Icon = getEventTypeIcon(event.event_type);
                  return (
                    <div key={event.id} className="border-b border-border/50 p-4 hover:bg-muted/30 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getStatusVariant(event.status)} className="text-xs">
                              {getEventTypeLabel(event.event_type)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          </div>
                          <h4 className="text-sm font-medium text-foreground mb-1">
                            {event.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {formatEventDateTime(event.start_date)}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground">
                              📍 {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center text-muted-foreground py-4">
          Loading events...
        </div>
      )}

      {!loading && contactEvents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No events scheduled yet. Click "New Event" to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}