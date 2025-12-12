import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";
import ClearableSelect from "@/components/ui/ClearableSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useProperties } from "@/hooks/useProperties";
import { Loader2, Calendar, Clock } from "lucide-react";
import { CalendarEvent } from "@/types";
import { format, addHours } from 'date-fns';

const eventSchema = z.object({
  description: z.string().optional(),
  event_type: z.enum(['property_viewing', 'lead_call', 'contact_meeting', 'follow_up', 'general'], { 
    required_error: "Event type is required" 
  }),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
  start_date: z.string().min(1, "Start date and time is required"),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  property_id: z.string().optional(),
  contact_id: z.string().min(1, "Contact is required"),
  reminder_minutes: z.number().min(0).default(15),
});

type EventFormData = z.infer<typeof eventSchema>;

interface CalendarEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editEvent?: CalendarEvent | null;
  defaultDate?: Date;
  preselectedContact?: string;
  preselectedProperty?: string;
}

const eventTypeOptions = [
  { value: 'property_viewing', label: 'Property Viewing' },
  { value: 'lead_call', label: 'Lead Call' },
  { value: 'contact_meeting', label: 'Contact Meeting' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'general', label: 'General' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

const reminderOptions = [
  { value: 0, label: 'No Reminder' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
];

// Auto-generate title based on event type
const getAutoTitle = (eventType: string) => {
  const titles: Record<string, string> = {
    'property_viewing': 'Property Viewing',
    'lead_call': 'Lead Call',
    'contact_meeting': 'Contact Meeting',
    'follow_up': 'Follow Up',
    'general': 'General Event',
  };
  return titles[eventType] || 'Event';
};

export const CalendarEventForm: React.FC<CalendarEventFormProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  editEvent,
  defaultDate,
  preselectedContact,
  preselectedProperty
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createEvent, updateEvent } = useCalendarEvents();
  const { properties } = useProperties();
  const [loading, setLoading] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      description: '',
      event_type: 'general',
      status: 'scheduled',
      start_date: defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : '',
      end_date: defaultDate ? format(addHours(defaultDate, 1), "yyyy-MM-dd'T'HH:mm") : '',
      notes: '',
      property_id: preselectedProperty || '',
      contact_id: preselectedContact || '',
      reminder_minutes: 15,
    },
  });

  // Reset form when editEvent changes
  useEffect(() => {
    if (editEvent) {
      form.reset({
        description: editEvent.description || '',
        event_type: editEvent.event_type as any || 'general',
        status: editEvent.status as any || 'scheduled',
        start_date: editEvent.start_date ? format(new Date(editEvent.start_date), "yyyy-MM-dd'T'HH:mm") : '',
        end_date: editEvent.end_date ? format(new Date(editEvent.end_date), "yyyy-MM-dd'T'HH:mm") : '',
        notes: editEvent.notes || '',
        property_id: editEvent.property_id || '',
        contact_id: editEvent.contact_id || '',
        reminder_minutes: editEvent.reminder_minutes || 15,
      });
    } else {
      const startDate = defaultDate || new Date();
      const endDate = addHours(startDate, 1);
      
      form.reset({
        description: '',
        event_type: 'general',
        status: 'scheduled',
        start_date: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        end_date: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        notes: '',
        property_id: preselectedProperty || '',
        contact_id: preselectedContact || '',
        reminder_minutes: 15,
      });
    }
  }, [editEvent, form, defaultDate, preselectedContact, preselectedProperty]);

  const onSubmit = async (data: EventFormData) => {
    try {
      setLoading(true);

      // Auto-generate title from event type
      const title = editEvent?.title || getAutoTitle(data.event_type);

      const eventData = {
        title,
        event_type: data.event_type,
        status: data.status,
        start_date: data.start_date,
        description: data.description || null,
        end_date: data.end_date || null,
        notes: data.notes || null,
        property_id: data.property_id || null,
        contact_id: data.contact_id || null,
        reminder_minutes: data.reminder_minutes,
      };

      if (editEvent) {
        await updateEvent(editEvent.id, eventData);
      } else {
        await createEvent(eventData);
      }

      toast({
        title: editEvent ? 'Event updated successfully' : 'Event created successfully',
        description: editEvent ? 'Event has been updated.' : 'New event has been scheduled.',
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Event form error:', error);
      
      let errorMessage = error.message || 'Please check all required fields and try again.';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only create events for yourself.';
      }
      
      toast({
        title: editEvent ? 'Error updating event' : 'Error creating event',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {editEvent ? 'Edit Event' : 'Schedule New Event'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Event Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type *</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={eventTypeOptions}
                        placeholder="Select event type"
                        allowClear={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={statusOptions}
                        placeholder="Select status"
                        allowClear={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Start Date & Time *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Related Entities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact *</FormLabel>
                    <FormControl>
                      <SearchableContactCombobox
                        value={field.value}
                        onChange={(contactId) => field.onChange(contactId)}
                        placeholder="Select contact"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={properties.map(p => ({ 
                          value: p.id, 
                          label: `${p.title} - ${p.address}` 
                        }))}
                        placeholder="Select property"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reminder_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value?.toString()}
                        onChange={(val) => field.onChange(Number(val))}
                        options={reminderOptions.map(r => ({ 
                          value: r.value.toString(), 
                          label: r.label 
                        }))}
                        placeholder="Select reminder"
                        allowClear={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add event description..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Saving...' : editEvent ? 'Update Event' : 'Schedule Event'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};