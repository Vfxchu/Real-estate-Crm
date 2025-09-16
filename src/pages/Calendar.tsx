import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MapPin,
  User,
  Phone,
  Building,
  Users,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Bell,
} from 'lucide-react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal } from '@/components/calendar/EventModal';
import { NotificationSystem } from '@/components/calendar/NotificationSystem';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEvent } from '@/types';
import { useLeads } from '@/hooks/useLeads';
import { useProperties } from '@/hooks/useProperties';
import { useDeals } from '@/hooks/useDeals';
import { useAuth } from '@/contexts/AuthContext';

export const Calendar = () => {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const { leads } = useLeads();
  const { properties } = useProperties();
  const { deals } = useDeals();
  const { profile } = useAuth();
  const isMobile = useIsMobile();

  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [defaultEventData, setDefaultEventData] = useState<{
    date?: Date;
    type?: CalendarEvent['event_type'];
    linkedRecord?: { type: 'lead' | 'property' | 'deal'; id: string };
  }>({});
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    eventType: 'all',
    status: 'all',
    dateRange: '30', // days
  });

  // Handle URL parameters for deep linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const propertyId = urlParams.get('property');
    const leadId = urlParams.get('lead');
    const dealId = urlParams.get('deal');

    if (action === 'schedule-viewing' && propertyId) {
      setDefaultEventData({
        type: 'property_viewing',
        linkedRecord: { type: 'property', id: propertyId },
      });
      setModalMode('create');
      setShowEventModal(true);
    } else if (action === 'schedule-call' && leadId) {
      setDefaultEventData({
        type: 'lead_call',
        linkedRecord: { type: 'lead', id: leadId },
      });
      setModalMode('create');
      setShowEventModal(true);
    } else if (action === 'schedule-meeting' && dealId) {
      setDefaultEventData({
        type: 'contact_meeting',
        linkedRecord: { type: 'deal', id: dealId },
      });
      setModalMode('create');
      setShowEventModal(true);
    }
  }, []);

  // Filter events based on criteria
  const filteredEvents = events.filter(event => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(searchTerm) ||
        event.lead_id ||
        event.property_id ||
        event.location?.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Event type filter
    if (filters.eventType !== 'all' && event.event_type !== filters.eventType) {
      return false;
    }

    // Status filter
    if (filters.status !== 'all' && event.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const daysDiff = parseInt(filters.dateRange);
      const eventDate = new Date(event.start_date);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysDiff);
      if (eventDate > cutoffDate) return false;
    }

    return true;
  });

  // Calculate statistics
  const stats = {
    total: events.length,
    upcoming: events.filter(e => new Date(e.start_date) >= new Date() && e.status === 'scheduled').length,
    today: events.filter(e => {
      const today = new Date();
      const eventDate = new Date(e.start_date);
      return eventDate.toDateString() === today.toDateString();
    }).length,
    completed: events.filter(e => e.status === 'completed').length,
    overdue: events.filter(e => {
      const now = new Date();
      const eventDate = new Date(e.start_date);
      return eventDate < now && e.status === 'scheduled';
    }).length,
  };

  // Event handlers
  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalMode('edit');
    setShowEventModal(true);
  };

  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    setDefaultEventData({ date: slotInfo.start });
    setModalMode('create');
    setShowEventModal(true);
  };

  const handleEventDrop = async (event: CalendarEvent, start: Date, end: Date) => {
    try {
      await updateEvent(event.id, {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });
    } catch (error) {
      console.error('Error rescheduling event:', error);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setDefaultEventData({});
    setModalMode('create');
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (modalMode === 'create') {
        await createEvent(eventData);
      } else if (selectedEvent) {
        await updateEvent(selectedEvent.id, eventData);
      }
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getTypeIcon = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'property_viewing': return <Building className="w-4 h-4" />;
      case 'contact_meeting': return <Users className="w-4 h-4" />;
      case 'lead_call': return <Phone className="w-4 h-4" />;
      case 'follow_up': return <Clock className="w-4 h-4" />;
      case 'general': return <CalendarIcon className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notification System */}
      <NotificationSystem 
        events={events} 
        onEventUpdate={updateEvent}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Calendar & Appointments</h1>
          <p className="text-muted-foreground">
            Central hub for all your CRM activities and appointments
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isMobile && (
            <Select value={calendarView} onValueChange={(value: any) => setCalendarView(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="agenda">Agenda</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button onClick={handleCreateEvent} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? 'New' : 'New Appointment'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CalendarIcon className="w-6 h-6 text-primary mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-info mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-lg font-bold">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Bell className="w-6 h-6 text-warning mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-lg font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-success mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 text-destructive mr-3" />
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-lg font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters (Mobile-friendly) */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search appointments..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:w-auto">
              <Select value={filters.eventType} onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value }))}>
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="viewing">Viewings</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="follow-up">Follow-ups</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Views */}
      {isMobile ? (
        <Tabs value={calendarView} onValueChange={(value: any) => setCalendarView(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="agenda">List</TabsTrigger>
          </TabsList>
          
          <TabsContent value={calendarView} className="mt-6">
            <Card className="card-elevated">
              <CardContent className="p-0">
                <CalendarView
                  events={filteredEvents}
                  onEventSelect={handleEventSelect}
                  onEventDrop={handleEventDrop}
                  onSlotSelect={handleSlotSelect}
                  view={calendarView}
                  onViewChange={setCalendarView}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="card-elevated">
          <CardContent className="p-0">
            <CalendarView
              events={filteredEvents}
              onEventSelect={handleEventSelect}
              onEventDrop={handleEventDrop}
              onSlotSelect={handleSlotSelect}
              view={calendarView}
              onViewChange={setCalendarView}
            />
          </CardContent>
        </Card>
      )}

      {/* Event Modal */}
      <EventModal
        event={modalMode === 'edit' ? selectedEvent : null}
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
          setDefaultEventData({});
        }}
        onSave={handleSaveEvent}
        onDelete={modalMode === 'edit' ? handleDeleteEvent : undefined}
        defaultDate={defaultEventData.date}
        defaultType={defaultEventData.type}
        linkedRecord={defaultEventData.linkedRecord}
      />

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading calendar events...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};