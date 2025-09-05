import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from 'lucide-react';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { useLeads } from '@/hooks/useLeads';

export const Calendar = () => {
  const { events, loading, createEvent, updateEvent } = useCalendarEvents();
  const { leads } = useLeads();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'meeting' as CalendarEvent['event_type'],
    lead_id: '',
    start_date: '',
    location: '',
    notes: '',
  });

  const filteredEvents = events.filter(event => 
    new Date(event.start_date).toDateString() === new Date(selectedDate).toDateString()
  );

  const getTypeIcon = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'viewing': return <MapPin className="w-4 h-4" />;
      case 'meeting': return <User className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'follow-up': return <Clock className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'viewing': return 'bg-primary text-primary-foreground';
      case 'meeting': return 'bg-success text-success-foreground';
      case 'call': return 'bg-warning text-warning-foreground';
      case 'follow-up': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'rescheduled': return <Clock className="w-4 h-4 text-warning" />;
      default: return <Clock className="w-4 h-4 text-info" />;
    }
  };

  const handleAddEvent = async () => {
    try {
      const startDateTime = new Date(`${eventForm.start_date}T00:00:00`).toISOString();
      await createEvent({
        ...eventForm,
        start_date: startDateTime,
      });
      setShowAddEvent(false);
      setEventForm({
        title: '',
        event_type: 'meeting',
        lead_id: '',
        start_date: '',
        location: '',
        notes: '',
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEventAction = async (action: string, eventId: string) => {
    try {
      if (action === 'completed') {
        await updateEvent(eventId, { status: 'completed' });
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const today = new Date();
  const upcomingEvents = events.filter(event => new Date(event.start_date) >= today).length;
  const todayEvents = filteredEvents.length;
  const completedEvents = events.filter(event => event.status === 'completed').length;
  const pendingEvents = events.filter(event => event.status === 'scheduled').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Appointments</h1>
          <p className="text-muted-foreground">
            Manage your appointments and follow-ups
          </p>
        </div>
        <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Appointment Type</Label>
                  <Select 
                    value={eventForm.event_type} 
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, event_type: value as CalendarEvent['event_type'] }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewing">Property Viewing</SelectItem>
                      <SelectItem value="meeting">Client Meeting</SelectItem>
                      <SelectItem value="call">Phone/Video Call</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lead</Label>
                  <Select 
                    value={eventForm.lead_id} 
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, lead_id: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    className="mt-2" 
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" className="mt-2" />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input 
                  placeholder="Appointment title" 
                  className="mt-2" 
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Location (Optional)</Label>
                <Input 
                  placeholder="Meeting location or property address" 
                  className="mt-2" 
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Additional notes..." 
                  className="mt-2" 
                  rows={3} 
                  value={eventForm.notes}
                  onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddEvent} className="btn-primary">Schedule</Button>
                <Button variant="outline" onClick={() => setShowAddEvent(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString().split('T')[0]);
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
                Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
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
                                {event.event_type}
                              </div>
                            </Badge>
                            {getStatusIcon(event.status)}
                            <span className="text-sm text-muted-foreground capitalize">
                              {event.status}
                            </span>
                          </div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.start_date).toLocaleTimeString()} • {event.lead_name || 'No lead'} • {event.agent_name || 'Agent'}
                          </p>
                          {event.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">Edit</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventAction('completed', event.id);
                            }}
                          >
                            Complete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No appointments scheduled</h3>
                  <p className="text-muted-foreground">
                    Schedule your first appointment for this date
                  </p>
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
                  <Badge className={getTypeColor(selectedEvent.event_type)}>
                    <div className="flex items-center gap-1">
                      {getTypeIcon(selectedEvent.event_type)}
                      {selectedEvent.event_type}
                    </div>
                  </Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedEvent.status)}
                    <span className="capitalize">{selectedEvent.status}</span>
                  </div>
                </div>
                <div>
                  <Label>Lead</Label>
                  <p>{selectedEvent.lead_name || 'No lead assigned'}</p>
                </div>
                <div>
                  <Label>Agent</Label>
                  <p>{selectedEvent.agent_name || 'Agent'}</p>
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <p>{new Date(selectedEvent.start_date).toLocaleDateString()} at {new Date(selectedEvent.start_date).toLocaleTimeString()}</p>
                </div>
                {selectedEvent.location && (
                  <div>
                    <Label>Location</Label>
                    <p>{selectedEvent.location}</p>
                  </div>
                )}
              </div>
              {selectedEvent.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvent.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="btn-primary">Edit Appointment</Button>
                <Button variant="outline">Mark as Completed</Button>
                <Button variant="outline">Reschedule</Button>
                <Button variant="outline" className="text-destructive">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};