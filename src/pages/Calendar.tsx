import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MapPin,
  User,
  Phone,
  Video,
  CheckCircle,
  AlertCircle,
  Bell,
  Edit,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCalendar } from '@/hooks/useCalendar';
import { useLeads } from '@/hooks/useLeads';
import { useProperties } from '@/hooks/useProperties';
import { useDeals } from '@/hooks/useDeals';
import { NotificationPopup } from '@/components/calendar/NotificationPopup';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

export const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'general' as const,
    start_date: '',
    end_date: '',
    location: '',
    notes: '',
    lead_id: '',
    property_id: '',
    deal_id: '',
    reminder_minutes: 15,
  });
  
  const { toast } = useToast();
  const { events, notifications, loading, createEvent, updateEvent, deleteEvent, markAsRead } = useCalendar();
  const { leads } = useLeads();
  const { properties } = useProperties();
  const { deals } = useDeals();

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const filteredEvents = events.filter(event => {
    const eventDate = format(parseISO(event.start_date), 'yyyy-MM-dd');
    return eventDate === selectedDateString;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property_viewing': return <MapPin className="w-4 h-4" />;
      case 'contact_meeting': return <User className="w-4 h-4" />;
      case 'lead_call': return <Phone className="w-4 h-4" />;
      case 'follow_up': return <Clock className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'property_viewing': return 'bg-primary text-primary-foreground';
      case 'contact_meeting': return 'bg-success text-success-foreground';
      case 'lead_call': return 'bg-warning text-warning-foreground';
      case 'follow_up': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'rescheduled': return <Clock className="w-4 h-4 text-warning" />;
      default: return <Clock className="w-4 h-4 text-info" />;
    }
  };

  const handleSubmitEvent = async () => {
    if (!eventForm.title || !eventForm.start_date) {
      toast({
        title: 'Missing information',
        description: 'Please provide at least a title and start date',
        variant: 'destructive',
      });
      return;
    }

    await createEvent(eventForm);
    setEventForm({
      title: '',
      description: '',
      event_type: 'general',
      start_date: '',
      end_date: '',
      location: '',
      notes: '',
      lead_id: '',
      property_id: '',
      deal_id: '',
      reminder_minutes: 15,
    });
    setShowAddEvent(false);
  };

  const handleUpdateEvent = async (status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled') => {
    if (!selectedEvent) return;
    await updateEvent(selectedEvent.id, { status });
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    await deleteEvent(selectedEvent.id);
    setSelectedEvent(null);
  };

  const upcomingEvents = events.filter(event => new Date(event.start_date) >= new Date()).length;
  const todayEvents = filteredEvents.length;
  const completedEvents = events.filter(event => event.status === 'completed').length;
  const pendingEvents = events.filter(event => event.status === 'scheduled').length;

  // Show notification popup for high priority notifications
  useEffect(() => {
    const highPriorityNotification = notifications.find(n => n.priority === 'high' || n.priority === 'urgent');
    if (highPriorityNotification && !selectedNotification) {
      setSelectedNotification(highPriorityNotification);
    }
  }, [notifications, selectedNotification]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Events</h1>
          <p className="text-muted-foreground">
            Centralized calendar synced with all CRM activities
          </p>
        </div>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <Button variant="outline" className="relative">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              <Badge className="absolute -top-2 -right-2 bg-destructive text-white">
                {notifications.length}
              </Badge>
            </Button>
          )}
          <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event Type</Label>
                  <Select value={eventForm.event_type} onValueChange={(value: any) => setEventForm(prev => ({ ...prev, event_type: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property_viewing">Property Viewing</SelectItem>
                      <SelectItem value="contact_meeting">Client Meeting</SelectItem>
                      <SelectItem value="lead_call">Lead Call</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="general">General Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contact/Lead</Label>
                  <SearchableContactCombobox
                    value={eventForm.lead_id}
                    onChange={(value) => setEventForm(prev => ({ ...prev, lead_id: value }))}
                    placeholder="Select contact..."
                  />
                </div>
                <div>
                  <Label>Start Date & Time</Label>
                  <Input 
                    type="datetime-local" 
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label>End Date & Time (Optional)</Label>
                  <Input 
                    type="datetime-local" 
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label>Property (Optional)</Label>
                  <Select value={eventForm.property_id} onValueChange={(value) => setEventForm(prev => ({ ...prev, property_id: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(property => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title} - {property.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deal (Optional)</Label>
                  <Select value={eventForm.deal_id} onValueChange={(value) => setEventForm(prev => ({ ...prev, deal_id: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      {deals.map(deal => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input 
                  placeholder="Event title" 
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-2" 
                />
              </div>
              <div>
                <Label>Location (Optional)</Label>
                <Input 
                  placeholder="Meeting location or address" 
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-2" 
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  placeholder="Event description..." 
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-2" 
                  rows={3} 
                />
              </div>
              <div>
                <Label>Reminder (minutes before)</Label>
                <Select value={eventForm.reminder_minutes.toString()} onValueChange={(value) => setEventForm(prev => ({ ...prev, reminder_minutes: parseInt(value) }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="1440">1 day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitEvent} className="btn-primary" disabled={loading}>
                  {loading ? 'Scheduling...' : 'Schedule Event'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddEvent(false)}>Cancel</Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CalendarIcon className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Selector */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
            />
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow);
                }}
              >
                Tomorrow
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>
                Schedule for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEvents.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getTypeColor(event.event_type)}>
                              <div className="flex items-center gap-1">
                                {getTypeIcon(event.event_type)}
                                {event.event_type.replace('_', ' ')}
                              </div>
                            </Badge>
                            {getStatusIcon(event.status)}
                            <span className="text-sm text-muted-foreground capitalize">
                              {event.status}
                            </span>
                          </div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(event.start_date), 'h:mm a')}
                            {event.lead_name && ` • ${event.lead_name}`}
                            {event.agent_name && ` • ${event.agent_name}`}
                          </p>
                          {event.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                          {event.property_title && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Property: {event.property_title}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateEvent('completed');
                            }}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
                  <p className="text-muted-foreground">
                    Schedule your first event for this date
                  </p>
                  <Button 
                    className="mt-4" 
                    variant="outline" 
                    onClick={() => setShowAddEvent(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <div className="mt-2">
                    <Badge className={getTypeColor(selectedEvent.event_type)}>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(selectedEvent.event_type)}
                        {selectedEvent.event_type.replace('_', ' ')}
                      </div>
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(selectedEvent.status)}
                    <span className="capitalize">{selectedEvent.status}</span>
                  </div>
                </div>
                {selectedEvent.lead_name && (
                  <div>
                    <Label>Contact/Lead</Label>
                    <p className="mt-2">{selectedEvent.lead_name}</p>
                  </div>
                )}
                {selectedEvent.agent_name && (
                  <div>
                    <Label>Agent</Label>
                    <p className="mt-2">{selectedEvent.agent_name}</p>
                  </div>
                )}
                <div>
                  <Label>Start Date & Time</Label>
                  <p className="mt-2">{format(parseISO(selectedEvent.start_date), 'PPP p')}</p>
                </div>
                {selectedEvent.end_date && (
                  <div>
                    <Label>End Date & Time</Label>
                    <p className="mt-2">{format(parseISO(selectedEvent.end_date), 'PPP p')}</p>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <Label>Location</Label>
                    <p className="mt-2">{selectedEvent.location}</p>
                  </div>
                )}
                {selectedEvent.property_title && (
                  <div>
                    <Label>Property</Label>
                    <p className="mt-2">{selectedEvent.property_title}</p>
                  </div>
                )}
              </div>
              {selectedEvent.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvent.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  className="btn-primary"
                  onClick={() => handleUpdateEvent('completed')}
                  disabled={selectedEvent.status === 'completed'}
                >
                  Mark as Completed
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleUpdateEvent('rescheduled')}
                >
                  Reschedule
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive"
                  onClick={() => handleUpdateEvent('cancelled')}
                >
                  Cancel Event
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive ml-auto"
                  onClick={handleDeleteEvent}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Notification Popup */}
      <NotificationPopup
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={() => {
          if (selectedNotification) {
            markAsRead(selectedNotification.id);
            setSelectedNotification(null);
          }
        }}
      />
    </div>
  );
};