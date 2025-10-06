import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types';

interface MeetingScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onComplete?: () => void;
  existingMeeting?: {
    id: string;
    title: string;
    start_date: string;
    description?: string;
  } | null;
}

export function MeetingScheduleDialog({ 
  isOpen, 
  onOpenChange, 
  lead, 
  onComplete,
  existingMeeting 
}: MeetingScheduleDialogProps) {
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationHoursBefore, setConfirmationHoursBefore] = useState(3);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && lead) {
      if (existingMeeting) {
        // Editing existing meeting
        setTitle(existingMeeting.title);
        const meetingDateTime = new Date(existingMeeting.start_date);
        setMeetingDate(meetingDateTime);
        setMeetingTime(format(meetingDateTime, 'HH:mm'));
        setNotes(existingMeeting.description || '');
      } else {
        // New meeting
        setTitle(`Meeting with ${lead.name}`);
        setMeetingDate(undefined);
        setMeetingTime('10:00');
        setLocation('');
        setNotes('');
      }
    }
  }, [isOpen, lead, existingMeeting]);

  const handleSubmit = async () => {
    if (!lead || !meetingDate) {
      toast({
        title: 'Missing Information',
        description: 'Please select meeting date and time',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const [hours, minutes] = meetingTime.split(':').map(Number);
      const meetingDateTime = new Date(meetingDate);
      meetingDateTime.setHours(hours, minutes, 0, 0);
      
      // Convert to UTC (assuming Dubai timezone +4)
      const utcDateTime = new Date(meetingDateTime.getTime() - (4 * 60 * 60 * 1000));
      const endDateTime = new Date(utcDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      if (existingMeeting) {
        // Update existing meeting
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title,
            start_date: utcDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            location: location || null,
            description: notes || null,
          })
          .eq('id', existingMeeting.id);

        if (error) throw error;

        // Log activity
        await supabase.from('activities').insert({
          type: 'meeting_rescheduled',
          description: `Meeting rescheduled to ${format(meetingDateTime, 'PPp')}`,
          lead_id: lead.id,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

        toast({
          title: 'Meeting Rescheduled',
          description: 'Meeting has been updated successfully',
        });
      } else {
        // Create new meeting event
        const { data: meetingEvent, error: meetingError } = await supabase
          .from('calendar_events')
          .insert({
            title,
            event_type: 'meeting',
            start_date: utcDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            lead_id: lead.id,
            agent_id: lead.agent_id,
            location: location || null,
            description: notes || null,
            status: 'scheduled',
            reminder_offset_min: 30,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (meetingError) throw meetingError;

        // Create confirmation task (3 hours before meeting by default)
        const confirmationDateTime = new Date(utcDateTime.getTime() - (confirmationHoursBefore * 60 * 60 * 1000));
        
        await supabase
          .from('calendar_events')
          .insert({
            title: `Confirm meeting with ${lead.name}`,
            event_type: 'follow_up',
            start_date: confirmationDateTime.toISOString(),
            end_date: new Date(confirmationDateTime.getTime() + 30 * 60 * 1000).toISOString(),
            lead_id: lead.id,
            agent_id: lead.agent_id,
            description: `Confirm upcoming meeting scheduled for ${format(meetingDateTime, 'PPp')}`,
            status: 'scheduled',
            reminder_offset_min: 15,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        // Update lead status and record outcome
        await supabase
          .from('leads')
          .update({ status: 'qualified' })
          .eq('id', lead.id);

        await supabase.from('lead_outcomes').insert({
          lead_id: lead.id,
          outcome: 'Meeting Scheduled',
          notes: `Meeting scheduled for ${format(meetingDateTime, 'PPp')}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

        // Log activity
        await supabase.from('activities').insert({
          type: 'meeting_scheduled',
          description: `Meeting scheduled for ${format(meetingDateTime, 'PPp')} • Confirmation task created`,
          lead_id: lead.id,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

        toast({
          title: 'Meeting Scheduled',
          description: 'Meeting and confirmation task have been created',
        });
      }

      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule meeting',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingMeeting ? 'Reschedule Meeting' : 'Schedule Meeting'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Meeting Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
            />
          </div>

          <div className="space-y-2">
            <Label>Date & Time *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {meetingDate ? format(meetingDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={meetingDate}
                    onSelect={setMeetingDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
            {meetingDate && (
              <p className="text-sm text-muted-foreground">
                Meeting: {format(meetingDate, "MMM d, yyyy")} at {meetingTime} (Dubai time)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Meeting location"
            />
          </div>

          {!existingMeeting && (
            <div className="space-y-2">
              <Label>Confirmation Reminder (hours before)</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={confirmationHoursBefore}
                onChange={(e) => setConfirmationHoursBefore(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                A confirmation task will be created {confirmationHoursBefore}h before the meeting
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Meeting notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !title.trim() || !meetingDate}
            >
              {loading ? "Scheduling..." : existingMeeting ? "Update Meeting" : "Schedule Meeting"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
