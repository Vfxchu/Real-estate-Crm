import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types";
import { EventModal } from "@/components/calendar/EventModal";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

interface LeadOutcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onComplete?: () => void;
  isFromTaskCompletion?: boolean; // New prop to indicate if opened from task completion
  selectedTaskId?: string | null; // ID of the task being completed
}

interface InvalidReason {
  id: string;
  label: string;
}

interface DealLostReason {
  id: string;
  label: string;
}

const FOLLOW_UP_OUTCOMES = [
  'Call Back Request',
  'No Answer',
  'Interested',
  'Meeting Scheduled',
  'Under Offer',
  'Deal Won',
  'Deal Lost',
  'Invalid'
] as const;

type FollowUpOutcome = typeof FOLLOW_UP_OUTCOMES[number];

export function LeadOutcomeDialog({ isOpen, onOpenChange, lead, onComplete, isFromTaskCompletion = false, selectedTaskId = null }: LeadOutcomeDialogProps) {
  const [outcome, setOutcome] = useState<FollowUpOutcome | "">("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [selectedReason, setSelectedReason] = useState("");
  const [clientStillWithUs, setClientStillWithUs] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  
  const [invalidReasons, setInvalidReasons] = useState<InvalidReason[]>([]);
  const [dealLostReasons, setDealLostReasons] = useState<DealLostReason[]>([]);
  const [availableOutcomes, setAvailableOutcomes] = useState<FollowUpOutcome[]>([]);
  
  const { toast } = useToast();
  const { createEvent } = useCalendarEvents();

  useEffect(() => {
    if (isOpen && lead) {
      loadReasons();
      loadAvailableOutcomes();
      resetForm();
    }
  }, [isOpen, lead]);

  const resetForm = () => {
    setOutcome("");
    setNotes("");
    
    // If opened from task completion, set follow-up to 15 minutes from now
    if (isFromTaskCompletion) {
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
      setFollowUpDate(in15Minutes);
      setFollowUpTime(format(in15Minutes, 'HH:mm'));
    } else {
      setFollowUpDate(undefined);
      setFollowUpTime("09:00");
    }
    
    setSelectedReason("");
    setClientStillWithUs(null);
  };

  const loadReasons = async () => {
    try {
      const [invalidResult, dealLostResult] = await Promise.all([
        supabase.from('invalid_reasons').select('id, label').eq('is_active', true),
        supabase.from('deal_lost_reasons').select('id, label').eq('is_active', true)
      ]);

      if (invalidResult.data) setInvalidReasons(invalidResult.data);
      if (dealLostResult.data) setDealLostReasons(dealLostResult.data);
    } catch (error) {
      console.error('Error loading reasons:', error);
    }
  };

  const loadAvailableOutcomes = async () => {
    if (!lead) return;

    try {
      // Get current stage and past outcomes
      const { data: pastOutcomes } = await supabase
        .from('lead_outcomes')
        .select('outcome')
        .eq('lead_id', lead.id);

      const usedOutcomes = pastOutcomes?.map(o => o.outcome) || [];
      const currentStage = lead.status.toLowerCase();

      // Apply visibility rules
      let available = [...FOLLOW_UP_OUTCOMES];

      // Deal Won is always available for all stages

      // Remove one-time outcomes that were already used
      available = available.filter(o => {
        if (['Interested', 'Under Offer', 'Meeting Scheduled'].includes(o)) {
          return !usedOutcomes.includes(o);
        }
        return true;
      });

      setAvailableOutcomes(available);
    } catch (error) {
      console.error('Error loading available outcomes:', error);
      setAvailableOutcomes([...FOLLOW_UP_OUTCOMES]);
    }
  };

  const handleOutcomeChange = (value: FollowUpOutcome) => {
    setOutcome(value);
    
    // If "Meeting Scheduled" is selected, trigger event modal
    if (value === 'Meeting Scheduled') {
      // Set default date to 15 minutes from now
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
      setFollowUpDate(in15Minutes);
      setFollowUpTime(format(in15Minutes, 'HH:mm'));
      
      // Open event modal
      setShowEventModal(true);
    }
  };

  const handleEventSaved = async (eventData: any) => {
    setShowEventModal(false);
    setLoading(true);
    
    try {
      // Extract datetime from the event
      const eventDate = new Date(eventData.start_date);
      
      // Convert to UTC (assuming Dubai timezone +4)
      const utcDueAt = new Date(eventDate.getTime() - (4 * 60 * 60 * 1000));

      // Record the outcome immediately
      const { data, error } = await supabase.rpc('apply_followup_outcome', {
        p_lead_id: lead!.id,
        p_outcome: 'Meeting Scheduled',
        p_due_at: utcDueAt.toISOString(),
        p_reason_id: null,
        p_client_still_with_us: null,
        p_notes: notes || null
      });

      if (error) {
        console.error('Error recording outcome:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to record outcome',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const result = (data as any)?.[0];

      toast({
        title: "Meeting Scheduled",
        description: `Event created • Lead moved to ${result.new_stage} stage`,
        variant: "default"
      });

      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error applying outcome:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record outcome",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check for terminal status before proceeding
    if (lead && (lead.status === 'won' || lead.status === 'lost' || 
        (lead.custom_fields as any)?.invalid === 'true' ||
        (lead.custom_fields as any)?.invalid === true)) {
      toast({
        title: 'Cannot Record Outcome',
        description: `This lead is already ${lead.status === 'won' ? 'Won' : lead.status === 'lost' ? 'Lost' : 'Invalid'}. Change status from the Status tab if needed.`,
        variant: 'destructive',
      });
      return;
    }

    if (!lead || !outcome || !followUpDate) {
      toast({
        title: "Missing Information",
        description: "Please select outcome and follow-up date/time",
        variant: "destructive"
      });
      return;
    }

    // Validate required reasons
    if (['Invalid', 'Deal Lost'].includes(outcome) && !selectedReason) {
      toast({
        title: "Reason Required",
        description: `Please select a reason for ${outcome}`,
        variant: "destructive"
      });
      return;
    }

    // Validate Deal Lost client response
    if (outcome === 'Deal Lost' && clientStillWithUs === null) {
      toast({
        title: "Missing Information",
        description: "Please specify if the client is still with us",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Combine date and time in UTC
      const [hours, minutes] = followUpTime.split(':').map(Number);
      const dueAt = new Date(followUpDate);
      dueAt.setHours(hours, minutes, 0, 0);
      
      // Convert to UTC (assuming Dubai timezone +4)
      const utcDueAt = new Date(dueAt.getTime() - (4 * 60 * 60 * 1000));

      const { data, error } = await supabase.rpc('apply_followup_outcome', {
        p_lead_id: lead.id,
        p_outcome: outcome,
        p_due_at: utcDueAt.toISOString(),
        p_reason_id: selectedReason || null,
        p_client_still_with_us: clientStillWithUs,
        p_notes: notes || null
      });

      if (error) {
        console.error('Error recording outcome:', error);
        // Handle terminal status errors with clear messages
        if (error.message.includes('workflow ended')) {
          toast({
            title: 'Cannot Record Outcome',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message || 'Failed to record outcome',
            variant: 'destructive',
          });
        }
        setLoading(false);
        return;
      }

      const result = (data as any)?.[0];
      
      // If this was opened from task completion, mark the original task as completed
      if (isFromTaskCompletion && selectedTaskId) {
        try {
          // Try to find the linked task and mark it completed
          const { data: linkedTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('calendar_event_id', selectedTaskId)
            .maybeSingle();

          if (linkedTask) {
            await supabase.rpc('complete_task_with_auto_followup', {
              p_task_id: linkedTask.id
            });
          } else {
            // Fallback: mark calendar event as completed
            await supabase
              .from('calendar_events')
              .update({ status: 'completed' })
              .eq('id', selectedTaskId);
          }
        } catch (taskError) {
          console.error('Error completing original task:', taskError);
          // Don't throw - the outcome was recorded successfully
        }
      }

      toast({
        title: "Outcome Recorded",
        description: `Lead moved to ${result.new_stage} stage • Follow-up task created`,
        variant: "default"
      });

      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error applying outcome:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record outcome",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  const showReasonSelection = outcome === 'Invalid' || outcome === 'Deal Lost';
  const showClientQuestion = outcome === 'Deal Lost';
  const reasonOptions = outcome === 'Invalid' ? invalidReasons : dealLostReasons;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Follow-Up Outcome</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outcome Selection */}
          <div className="space-y-2">
            <Label>Outcome *</Label>
            <Select value={outcome} onValueChange={handleOutcomeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {availableOutcomes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {outcome === 'Meeting Scheduled' && (
              <p className="text-sm text-muted-foreground">
                Please schedule the meeting in the calendar form.
              </p>
            )}
          </div>

          {/* Reason Selection (for Invalid/Deal Lost) */}
          {showReasonSelection && (
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client Still With Us (for Deal Lost) */}
          {showClientQuestion && (
            <div className="space-y-3">
              <Label>Is the client still with us? *</Label>
              <RadioGroup 
                value={clientStillWithUs?.toString() || ""} 
                onValueChange={(value) => setClientStillWithUs(value === "true")}
              >
                <Card className="p-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="yes" />
                    <Label htmlFor="yes" className="cursor-pointer">
                      Yes - Restart workflow from New stage
                    </Label>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="no" />
                    <Label htmlFor="no" className="cursor-pointer">
                      No - Mark as Lost and create closure task
                    </Label>
                  </div>
                </Card>
              </RadioGroup>
            </div>
          )}

          {/* Follow-up Date & Time - Hidden for Meeting Scheduled */}
          {outcome !== 'Meeting Scheduled' && (
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
              {followUpDate && (
                <p className="text-sm text-muted-foreground">
                  Scheduled for: {format(followUpDate, "MMM d, yyyy")} at {followUpTime} (Dubai time)
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes about this outcome..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions - Hide for Meeting Scheduled since it auto-submits */}
          {outcome !== 'Meeting Scheduled' && (
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !outcome || !followUpDate}
              >
                {loading ? "Recording..." : "Record Outcome"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Event Modal for Meeting Scheduled */}
      {lead && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSave={async (eventData) => {
            const createdEvent = await createEvent({
              ...eventData,
              lead_id: lead.id,
              event_type: 'contact_meeting'
            });
            if (createdEvent) {
              handleEventSaved(createdEvent);
            }
          }}
          linkedRecord={{
            type: 'lead',
            id: lead.id,
          }}
          defaultType="contact_meeting"
        />
      )}
    </Dialog>
  );
}