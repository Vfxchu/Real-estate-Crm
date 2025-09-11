import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventDrop: (event: CalendarEvent, start: Date, end: Date) => void;
  onSlotSelect: (slotInfo: { start: Date; end: Date }) => void;
  view: 'month' | 'week' | 'day' | 'agenda';
  onViewChange: (view: 'month' | 'week' | 'day' | 'agenda') => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onEventSelect,
  onEventDrop,
  onSlotSelect,
  view,
  onViewChange,
}) => {
  // Transform CalendarEvent to react-big-calendar format
  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_date),
      end: event.end_date ? new Date(event.end_date) : new Date(new Date(event.start_date).getTime() + 60 * 60 * 1000), // 1 hour default
      resource: event,
      allDay: false,
    }));
  }, [events]);

  // Color coding for event types
  const getEventStyle = (event: any) => {
    const calendarEvent = event.resource as CalendarEvent;
    let backgroundColor = '#6366f1'; // default primary color
    
    switch (calendarEvent.event_type) {
      case 'viewing':
        backgroundColor = '#10b981'; // green for property viewings
        break;
      case 'meeting':
        backgroundColor = '#f59e0b'; // yellow for meetings
        break;
      case 'call':
        backgroundColor = '#3b82f6'; // blue for calls
        break;
      case 'follow-up':
        backgroundColor = '#8b5cf6'; // purple for follow-ups
        break;
    }

    // Adjust opacity based on status
    if (calendarEvent.status === 'completed') {
      backgroundColor = backgroundColor + '80'; // 50% opacity
    } else if (calendarEvent.status === 'cancelled') {
      backgroundColor = '#ef4444'; // red for cancelled
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '12px',
        padding: '2px 6px',
      }
    };
  };

  // Custom event component for better mobile display
  const EventComponent = ({ event }: { event: any }) => {
    const calendarEvent = event.resource as CalendarEvent;
    return (
      <div className="flex items-center gap-1 text-xs">
        <div className="w-2 h-2 rounded-full bg-current opacity-80" />
        <span className="truncate">{event.title}</span>
        {calendarEvent.lead_name && (
          <span className="opacity-70">• {calendarEvent.lead_name}</span>
        )}
      </div>
    );
  };

  // Handle event drop for drag-and-drop rescheduling
  const handleEventDrop = ({ event, start, end }: { event: any; start: Date; end: Date }) => {
    const calendarEvent = event.resource as CalendarEvent;
    onEventDrop(calendarEvent, start, end);
  };

  return (
    <div className="h-full bg-background rounded-lg border calendar-container">
      <style>{`
        .calendar-container .rbc-calendar {
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
          font-family: inherit;
        }
        
        .calendar-container .rbc-header {
          background-color: hsl(var(--muted));
          color: hsl(var(--muted-foreground));
          border-bottom: 1px solid hsl(var(--border));
          padding: 8px 12px;
          font-weight: 500;
        }
        
        .calendar-container .rbc-month-view, .calendar-container .rbc-time-view {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          overflow: hidden;
        }
        
        .rbc-date-cell {
          text-align: center;
          padding: 8px 4px;
          color: hsl(var(--muted-foreground));
        }
        
        .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
        
        .rbc-today {
          background-color: hsl(var(--primary) / 0.1);
        }
        
        .rbc-slot-selection {
          background-color: hsl(var(--primary) / 0.2);
        }
        
        .rbc-time-slot {
          border-top: 1px solid hsl(var(--border));
        }
        
        .rbc-timeslot-group {
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.3);
        }
        
        .rbc-current-time-indicator {
          background-color: hsl(var(--primary));
        }
        
        @media (max-width: 768px) {
          .rbc-calendar {
            font-size: 12px;
          }
          
          .rbc-toolbar {
            flex-direction: column;
            gap: 8px;
            padding: 12px;
          }
          
          .rbc-toolbar-label {
            font-size: 16px;
            font-weight: 600;
          }
          
          .rbc-btn-group {
            display: flex;
            gap: 4px;
          }
          
          .rbc-btn-group button {
            padding: 6px 12px;
            font-size: 12px;
            border: 1px solid hsl(var(--border));
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            border-radius: 4px;
          }
          
          .rbc-btn-group button.rbc-active {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
          }
        }
      `}</style>
      
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', minHeight: '500px' }}
        view={view}
        onView={onViewChange}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        onSelectEvent={(event) => onEventSelect(event.resource)}
        onSelectSlot={onSlotSelect}
        selectable
        eventPropGetter={getEventStyle}
        components={{
          event: EventComponent,
        }}
        step={30}
        timeslots={2}
        toolbar={true}
        popup={true}
        popupOffset={{ x: 30, y: 20 }}
        messages={{
          today: 'Today',
          previous: '‹',
          next: '›',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Time',
          event: 'Event',
          allDay: 'All Day',
          noEventsInRange: 'No appointments in this range.',
        }}
      />
    </div>
  );
};