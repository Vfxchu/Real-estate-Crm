import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { useLeads } from '@/hooks/useLeads';
import { useProperties } from '@/hooks/useProperties';
import { useContacts } from '@/hooks/useContacts';
import { useDeals } from '@/hooks/useDeals';
import { format } from 'date-fns';
import {
  CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Video,
  CheckCircle,
  AlertCircle,
  Users,
  Building,
  Handshake,
} from 'lucide-react';

interface EventModalProps {
  event?: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  defaultDate?: Date;
  defaultType?: CalendarEvent['event_type'];
  linkedRecord?: {
    type: 'lead' | 'property' | 'contact' | 'deal';
    id: string;
  };
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultDate,
  defaultType,
  linkedRecord,
}) => {
  const { leads } = useLeads();
  const { properties } = useProperties();
  const contactsHook = useContacts();
  const { deals } = useDeals();

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'meeting' as CalendarEvent['event_type'],
    start_date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    lead_id: '',
    property_id: '',
    // contact_id: '',
    deal_id: '',
    reminder_minutes: 15,
  });

  const [loading, setLoading] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : null;
      
      setFormData({
        title: event.title || '',
        event_type: event.event_type,
        start_date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_time: endDate ? format(endDate, 'HH:mm') : '',
        location: event.location || '',
        notes: event.notes || '',
        lead_id: event.lead_id || '',
        property_id: event.property_id || '',
        // contact_id: event.contact_id || '',
        deal_id: event.deal_id || '',
        reminder_minutes: event.reminder_minutes || 15,
      });
    } else {
      const defaultDateTime = defaultDate || new Date();
      setFormData(prev => ({
        ...prev,
        start_date: format(defaultDateTime, 'yyyy-MM-dd'),
        start_time: format(defaultDateTime, 'HH:mm'),
        event_type: defaultType || 'meeting',
        lead_id: linkedRecord?.type === 'lead' ? linkedRecord.id : '',
        property_id: linkedRecord?.type === 'property' ? linkedRecord.id : '',
        // contact_id: linkedRecord?.type === 'contact' ? linkedRecord.id : '',
        deal_id: linkedRecord?.type === 'deal' ? linkedRecord.id : '',
      }));
    }
  }, [event, defaultDate, defaultType, linkedRecord]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Combine date and time
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = formData.end_time 
        ? new Date(`${formData.start_date}T${formData.end_time}`)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

      const eventData: Partial<CalendarEvent> = {
        title: formData.title,
        event_type: formData.event_type,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        lead_id: formData.lead_id && formData.lead_id !== 'none' ? formData.lead_id : undefined,
        property_id: formData.property_id && formData.property_id !== 'none' ? formData.property_id : undefined,
        // contact_id: formData.contact_id || undefined,
        deal_id: formData.deal_id && formData.deal_id !== 'none' ? formData.deal_id : undefined,
        reminder_minutes: formData.reminder_minutes,
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (event && onDelete) {
      try {
        setLoading(true);
        await onDelete(event.id);
        onClose();
      } catch (error) {
        console.error('Error deleting event:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getTypeIcon = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'viewing': return <Building className="w-4 h-4" />;
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'follow-up': return <Clock className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'viewing': return 'bg-green-500 text-white';
      case 'meeting': return 'bg-yellow-500 text-white';
      case 'call': return 'bg-blue-500 text-white';
      case 'follow-up': return 'bg-purple-500 text-white';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event ? 'Edit Appointment' : 'Schedule New Appointment'}
            {formData.event_type && (
              <Badge className={getTypeColor(formData.event_type)}>
                {getTypeIcon(formData.event_type)}
                <span className="ml-1 capitalize">{formData.event_type}</span>
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter appointment title"
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="event_type">Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value as CalendarEvent['event_type'] }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewing">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Property Viewing
                    </div>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Client Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="call">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone/Video Call
                    </div>
                  </SelectItem>
                  <SelectItem value="follow-up">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Follow-up
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start_date">Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative mt-2">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Meeting location or property address"
                className="pl-10"
              />
            </div>
          </div>

          {/* CRM Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lead_id">Related Lead</Label>
              <Select
                value={formData.lead_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, lead_id: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {lead.name} {lead.email && `(${lead.email})`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="property_id">Related Property</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select property (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No property</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {property.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Relations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deal_id">Related Deal</Label>
              <Select
                value={formData.deal_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, deal_id: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select deal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No deal</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      <div className="flex items-center gap-2">
                        <Handshake className="w-4 h-4" />
                        {deal.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reminder_minutes">Reminder</Label>
              <Select
                value={formData.reminder_minutes.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, reminder_minutes: parseInt(value) }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No reminder</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or agenda items..."
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={loading || !formData.title || !formData.start_date}
              className="flex-1"
            >
              {loading ? 'Saving...' : event ? 'Update Appointment' : 'Schedule Appointment'}
            </Button>
            
            {event && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};