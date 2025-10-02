import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { logOutcome, CallOutcome, formatCallOutcome } from '@/services/crm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DealLostWorkflowDialog } from './DealLostWorkflowDialog';
import { TaskCreationDialog } from './TaskCreationDialog';

interface CallOutcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadStatus?: string;
  leadCustomFields?: any;
  onComplete: () => void;
}

type BusinessOutcome = 'call_back_request' | 'no_answer' | 'interested' | 'meeting_scheduled' | 'under_offer' | 'deal_won' | 'deal_lost' | 'invalid';

const INVALID_REASONS = [
  'Developer', 'Agent', 'Marketing', 'Job Request', 'Test/Junk Data',
  'Incorrect Contact Details', 'Existing Client', 'Only Researching/Browsing',
  'No Answer After Multiple Attempts'
];

const DEAL_LOST_REASONS = [
  'Property Not Available', 'Seller Backed Out', 'Financing Issues',
  'Lost to Competitor', 'Legal/Compliance Issue', 'Couldn\'t Find Suitable Property',
  'No Answer After Multiple Attempts', 'Offer Rejected (Client Will Not Raise)',
  'Budget Too Low'
];

// Business outcomes mapping to DB enum
const businessOutcomes: { value: BusinessOutcome; label: string; dbOutcome: CallOutcome }[] = [
  { value: 'call_back_request', label: 'Call Back Request', dbOutcome: 'callback' },
  { value: 'no_answer', label: 'No Answer', dbOutcome: 'no_answer' },
  { value: 'interested', label: 'Interested', dbOutcome: 'interested' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', dbOutcome: 'interested' },
  { value: 'under_offer', label: 'Under Offer', dbOutcome: 'other' },
  { value: 'deal_won', label: 'Deal Won', dbOutcome: 'other' },
  { value: 'deal_lost', label: 'Deal Lost', dbOutcome: 'not_interested' },
  { value: 'invalid', label: 'Invalid', dbOutcome: 'invalid' }
];

export function CallOutcomeDialog({ 
  isOpen, 
  onOpenChange, 
  leadId, 
  leadName,
  leadStatus = 'new',
  leadCustomFields,
  onComplete 
}: CallOutcomeDialogProps) {
  const [businessOutcome, setBusinessOutcome] = useState<BusinessOutcome>();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState<Date>();
  const [callbackTime, setCallbackTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDealLostWorkflow, setShowDealLostWorkflow] = useState(false);
  const [showTaskCreation, setShowTaskCreation] = useState(false);
  const [taskCreationType, setTaskCreationType] = useState<'follow_up' | 'meeting' | 'under_offer' | 'closure'>('follow_up');
  const { toast } = useToast();

  // Get available outcomes based on current status and gating rules
  const getAvailableOutcomes = async () => {
    // Get lead's current outcomes_selected for idempotency
    const { data: lead } = await supabase
      .from('leads')
      .select('custom_fields')
      .eq('id', leadId)
      .single();
    
    const customFields = lead?.custom_fields as any || {};
    const selectedOutcomes = customFields.outcomes_selected || [];
    
    let outcomes = businessOutcomes.filter(outcome => {
      // Hide Deal Won until Under Offer stage
      if (outcome.value === 'deal_won' && leadStatus !== 'negotiating') {
        return false;
      }
      
      // In Contacted stage, hide advanced outcomes
      if (leadStatus === 'contacted' && 
          ['under_offer', 'deal_lost', 'deal_won'].includes(outcome.value)) {
        return false;
      }
      
      // Implement idempotency - hide already selected outcomes except meeting_scheduled
      if (selectedOutcomes.includes(outcome.value) && outcome.value !== 'meeting_scheduled') {
        return false;
      }
      
      return true;
    });
    
    return outcomes;
  };

  const needsReason = businessOutcome === 'deal_lost' || businessOutcome === 'invalid';
  const reasonOptions = businessOutcome === 'deal_lost' ? DEAL_LOST_REASONS : INVALID_REASONS;

  const handleSubmit = async () => {
    if (!businessOutcome) return;
    if (needsReason && !reason) {
      toast({
        title: 'Reason required',
        description: `Please select a reason for ${businessOutcome.replace('_', ' ')}.`,
        variant: 'destructive',
      });
      return;
    }

    // Special handling for deal_lost - show workflow dialog
    if (businessOutcome === 'deal_lost') {
      onOpenChange(false);
      setShowDealLostWorkflow(true);
      return;
    }

    setLoading(true);
    try {
      const selectedOutcome = businessOutcomes.find(o => o.value === businessOutcome);
      if (!selectedOutcome) return;

      let callbackAt: string | undefined;
      
      if (businessOutcome === 'call_back_request' && callbackDate) {
        const [hours, minutes] = callbackTime ? callbackTime.split(':').map(Number) : [9, 0];
        const datetime = new Date(callbackDate);
        datetime.setHours(hours, minutes, 0, 0);
        callbackAt = datetime.toISOString();
      }

      // Get current custom_fields to preserve existing data
      const { data: currentLead } = await supabase
        .from('leads')
        .select('custom_fields')
        .eq('id', leadId)
        .single();

      const currentCustomFields = (currentLead?.custom_fields as any) || {};
      const currentOutcomes = currentCustomFields.outcomes_selected || [];

      // Prepare rich description JSON
      const descriptionData: any = {
        business_outcome: businessOutcome,
        note: notes.trim() || undefined
      };

      if (needsReason && reason) {
        descriptionData.reason = reason;
      }

      if (callbackAt) {
        descriptionData.callback_at = callbackAt;
      }

      // Update custom_fields with idempotency tracking
      const updatedCustomFields = {
        ...currentCustomFields,
        outcomes_selected: [...new Set([...currentOutcomes, businessOutcome])]
      };

      // Handle invalid marking
      if (businessOutcome === 'invalid') {
        updatedCustomFields.invalid = 'true';
        updatedCustomFields.invalid_at = new Date().toISOString();
      }

      // Update lead custom_fields
      await supabase
        .from('leads')
        .update({ custom_fields: updatedCustomFields })
        .eq('id', leadId);

      // Log the outcome with mapped DB enum
      await logOutcome({
        leadId,
        outcome: selectedOutcome.dbOutcome,
        notes: JSON.stringify(descriptionData),
        callbackAt
      });

      // Auto-create follow-up tasks for ALL outcomes (as per spec)
      const taskType = businessOutcome === 'meeting_scheduled' ? 'meeting' 
                      : businessOutcome === 'under_offer' ? 'under_offer'
                      : businessOutcome === 'deal_won' ? 'closure'
                      : 'follow_up';
      
      setTaskCreationType(taskType);
      setShowTaskCreation(true);

      toast({
        title: 'Call outcome recorded',
        description: `Lead outcome: ${selectedOutcome.label}`,
      });

      // All outcomes require task creation as per final spec
      
      // Reset form
      setBusinessOutcome(undefined);
      setReason('');
      setNotes('');
      setCallbackDate(undefined);
      setCallbackTime('');
    } catch (error: any) {
      toast({
        title: 'Error recording outcome',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const needsCallbackTime = businessOutcome === 'call_back_request';
  const [availableOutcomes, setAvailableOutcomes] = useState<typeof businessOutcomes>([]);

  // Load available outcomes when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      getAvailableOutcomes().then(setAvailableOutcomes);
    }
  }, [isOpen, leadId, leadStatus]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Call Outcome</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Lead: {leadName}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">Call Outcome</Label>
              <Select value={businessOutcome} onValueChange={(value) => setBusinessOutcome(value as BusinessOutcome)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {availableOutcomes.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          {needsReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((reasonOption) => (
                    <SelectItem key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsCallbackTime && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Callback Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !callbackDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {callbackDate ? format(callbackDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={callbackDate}
                      onSelect={setCallbackDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Callback Time</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={callbackTime}
                      onChange={(e) => setCallbackTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-md"
                      placeholder="HH:MM"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = addMinutes(new Date(), 30);
                      setCallbackTime(format(now, 'HH:mm'));
                    }}
                  >
                    +30m
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about the call..."
              rows={3}
            />
          </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!businessOutcome || (needsReason && !reason) || loading}
                className="flex-1"
              >
                {loading ? 'Recording...' : 'Record Outcome'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Lost Workflow Dialog */}
      <DealLostWorkflowDialog
        isOpen={showDealLostWorkflow}
        onOpenChange={setShowDealLostWorkflow}
        leadId={leadId}
        leadName={leadName}
        onComplete={onComplete}
      />

      {/* Task Creation Dialog */}
      <TaskCreationDialog
        isOpen={showTaskCreation}
        onOpenChange={(open) => {
          setShowTaskCreation(open);
          if (!open) {
            onComplete();
            onOpenChange(false);
          }
        }}
        leadId={leadId}
        leadName={leadName}
        taskType={taskCreationType}
        businessOutcome={businessOutcome}
        onComplete={onComplete}
        leadStatus={leadStatus}
        leadCustomFields={leadCustomFields}
      />
    </>
  );
}