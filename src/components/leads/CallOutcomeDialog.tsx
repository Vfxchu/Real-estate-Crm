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
import { useToast } from '@/hooks/use-toast';

interface CallOutcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onComplete: () => void;
}

const callOutcomes: CallOutcome[] = [
  'interested',
  'callback', 
  'no_answer',
  'busy',
  'not_interested',
  'invalid',
  'other'
];

export function CallOutcomeDialog({ 
  isOpen, 
  onOpenChange, 
  leadId, 
  leadName, 
  onComplete 
}: CallOutcomeDialogProps) {
  const [outcome, setOutcome] = useState<CallOutcome>();
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState<Date>();
  const [callbackTime, setCallbackTime] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!outcome) return;

    setLoading(true);
    try {
      let callbackAt: string | undefined;
      
      if (outcome === 'callback' && callbackDate) {
        const [hours, minutes] = callbackTime ? callbackTime.split(':').map(Number) : [9, 0];
        const datetime = new Date(callbackDate);
        datetime.setHours(hours, minutes, 0, 0);
        callbackAt = datetime.toISOString();
      }

      await logOutcome({
        leadId,
        outcome,
        notes: notes.trim() || undefined,
        callbackAt
      });

      toast({
        title: 'Call outcome recorded',
        description: `Lead outcome: ${formatCallOutcome(outcome)}`,
      });

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setOutcome(undefined);
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

  const needsCallbackTime = outcome === 'callback';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Call Outcome</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Lead: {leadName}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outcome">Call Outcome</Label>
            <Select value={outcome} onValueChange={(value) => setOutcome(value as CallOutcome)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {callOutcomes.map((outcomeOption) => (
                  <SelectItem key={outcomeOption} value={outcomeOption}>
                    {formatCallOutcome(outcomeOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!outcome || loading}
              className="flex-1"
            >
              {loading ? 'Recording...' : 'Record Outcome'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}