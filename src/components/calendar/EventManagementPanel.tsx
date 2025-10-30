import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarEvent } from '@/types';
import { format } from 'date-fns';
import { formatDubaiTime } from '@/lib/dubai-time';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Building,
  Users,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventManagementPanelProps {
  events: CalendarEvent[];
  onEventEdit: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  onEventComplete: (event: CalendarEvent) => void;
  onEventSelect: (event: CalendarEvent) => void;
}

export const EventManagementPanel: React.FC<EventManagementPanelProps> = ({
  events,
  onEventEdit,
  onEventDelete,
  onEventComplete,
  onEventSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'rescheduled': return 'bg-warning/10 text-warning border-warning/20';
      case 'scheduled': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'property_viewing': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'contact_meeting': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'lead_call': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'follow_up': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'general': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const isOverdue = (event: CalendarEvent) => {
    return new Date(event.start_date) < new Date() && event.status === 'scheduled';
  };

  const filteredEvents = events
    .filter(event => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.notes?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const eventDate = new Date(event.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let category: string;
    if (event.status === 'completed') {
      category = 'Completed';
    } else if (event.status === 'cancelled') {
      category = 'Cancelled';
    } else if (isOverdue(event)) {
      category = 'Overdue';
    } else if (eventDate.toDateString() === today.toDateString()) {
      category = 'Today';
    } else if (eventDate < today) {
      category = 'Past';
    } else if (eventDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      category = 'This Week';
    } else {
      category = 'Upcoming';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const categoryOrder = ['Overdue', 'Today', 'This Week', 'Upcoming', 'Past', 'Completed', 'Cancelled'];
  const sortedCategories = Object.keys(groupedEvents).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <Card className="card-elevated h-full">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Event Management
        </CardTitle>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <ScrollArea className="h-[calc(100vh-280px)]">
        <CardContent className="p-4 space-y-6">
          {sortedCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events found</p>
            </div>
          )}
          
          {sortedCategories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                {category}
                <Badge variant="outline" className="ml-auto">
                  {groupedEvents[category].length}
                </Badge>
              </h3>
              
              <div className="space-y-2">
                {groupedEvents[category].map((event) => (
                  <Card
                    key={event.id}
                    className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                      isOverdue(event) ? 'border-l-destructive bg-destructive/5' : 'border-l-primary'
                    }`}
                    onClick={() => onEventSelect(event)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={getTypeColor(event.event_type)}>
                              {getTypeIcon(event.event_type)}
                              <span className="ml-1 capitalize text-xs">
                                {event.event_type.replace('_', ' ')}
                              </span>
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(event.status)}>
                              {event.status}
                            </Badge>
                            {isOverdue(event) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="font-semibold text-sm mb-1 truncate">
                            {event.title}
                          </h4>
                          
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDubaiTime(event.start_date, 'PPp')}
                            </div>
                            
                            {event.location && (
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventEdit(event);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            
                            {event.status === 'scheduled' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventComplete(event);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventDelete(event.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
