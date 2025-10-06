import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types';

interface MeetingOutcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  meetingTaskId?: string | null;
  onComplete?: () => void;
}

const MEETING_OUTCOMES = ['Interested', 'Under Offer', 'Not Interested'] as const;
type MeetingOutcome = typeof MEETING_OUTCOMES[number];

export function MeetingOutcomeDialog({ 
  isOpen, 
  onOpenChange, 
  lead, 
  meetingTaskId,
  onComplete 
}: MeetingOutcomeDialogProps) {
  const [outcome, setOutcome] = useState<MeetingOutcome | ''>('');
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const [dealLostReasons, setDealLostReasons] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadReasons();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setOutcome('');
    setSelectedReason('');
    setNotes('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(tomorrow);
    setFollowUpTime('09:00');
  };

  const loadReasons = async () => {
    try {
      const { data } = await supabase
        .from('deal_lost_reasons')
        .select('id, label')
        .eq('is_active', true);
      
      if (data) setDealLostReasons(data);
    } catch (error) {
      console.error('Error loading reasons:', error);
    }
  };

  const handleSubmit = async () => {
    if (!lead || !outcome) {
      toast({
        title: 'Missing Information',
        description: 'Please select an outcome',
        variant: 'destructive'
      });
      return;
    }

    // Require reason for "Not Interested"
    if (outcome === 'Not Interested' && !selectedReason) {
      toast({
        title: 'Reason Required',
        description: 'Please select a reason for Not Interested',
        variant: 'destructive'
      });
      return;
    }

    // Require follow-up date for Interested and Under Offer
    if ((outcome === 'Interested' || outcome === 'Under Offer') && !followUpDate) {
      toast({
        title: 'Missing Information',
        description: 'Please select a follow-up date',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Update lead status based on outcome
      const statusMap = {
        'Interested': 'qualified',
        'Under Offer': 'negotiating',
        'Not Interested': 'lost'
      };

      await supabase
        .from('leads')
        .update({ status: statusMap[outcome] })
        .eq('id', lead.id);

      // Create follow-up task for Interested/Under Offer
      if (outcome !== 'Not Interested' && followUpDate) {
        const [hours, minutes] = followUpTime.split(':').map(Number);
        const dueAt = new Date(followUpDate);
        dueAt.setHours(hours, minutes, 0, 0);
        const utcDueAt = new Date(dueAt.getTime() - (4 * 60 * 60 * 1000));

        await supabase.from('calendar_events').insert({
          title: `Follow up with ${lead.name}`,
          event_type: 'follow_up',
          start_date: utcDueAt.toISOString(),
          end_date: new Date(utcDueAt.getTime() + 60 * 60 * 1000).toISOString(),
          lead_id: lead.id,
          agent_id: lead.agent_id,
          description: `Follow-up after meeting outcome: ${outcome}`,
          status: 'scheduled',
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      }

      // Record outcome with reason
      const outcomeData: any = {
        lead_id: lead.id,
        outcome: outcome,
        notes: notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (outcome === 'Not Interested' && selectedReason) {
        outcomeData.reason_id = selectedReason;
      }

      await supabase.from('lead_outcomes').insert(outcomeData);

      // Log activity
      const reasonLabel = outcome === 'Not Interested' && selectedReason
        ? dealLostReasons.find(r => r.id === selectedReason)?.label
        : null;
      
      const activityDesc = outcome === 'Not Interested'
        ? `Meeting outcome: ${outcome} (${reasonLabel || 'No reason'})${notes ? ' • ' + notes : ''}`
        : `Meeting outcome: ${outcome} → ${statusMap[outcome]}${notes ? ' • ' + notes : ''}`;

      await supabase.from('activities').insert({
        type: 'meeting_outcome',
        description: activityDesc,
        lead_id: lead.id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

      // Mark meeting task as completed
      if (meetingTaskId) {
        await supabase
          .from('calendar_events')
          .update({ status: 'completed' })
          .eq('id', meetingTaskId);
      }

      toast({
        title: 'Meeting Outcome Recorded',
        description: `Lead moved to ${statusMap[outcome]} stage`,
      });

      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error recording meeting outcome:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record outcome',
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
          <DialogTitle>Record Meeting Outcome</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Meeting Outcome *</Label>
            <Select value={outcome} onValueChange={(value) => setOutcome(value as MeetingOutcome)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_OUTCOMES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {outcome === 'Not Interested' && (
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {dealLostReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(outcome === 'Interested' || outcome === 'Under Offer') && (
            <div className="space-y-2">
              <Label>Next Follow-up Date & Time *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? format(followUpDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={setFollowUpDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
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
              disabled={loading || !outcome}
            >
              {loading ? "Recording..." : "Record Outcome"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
