import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DealLostWorkflowDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onComplete: () => void;
}

export function DealLostWorkflowDialog({
  isOpen,
  onOpenChange,
  leadId,
  leadName,
  onComplete
}: DealLostWorkflowDialogProps) {
  const [clientStillWithUs, setClientStillWithUs] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const DEAL_LOST_REASONS = [
    'Property Not Available',
    'Seller Backed Out', 
    'Financing Issues',
    'Lost to Competitor',
    'Legal/Compliance Issue',
    'Couldn\'t Find Suitable Property',
    'No Answer After Multiple Attempts',
    'Offer Rejected (Client Will Not Raise)',
    'Budget Too Low'
  ];

  const handleSubmit = async () => {
    if (!reason || !clientStillWithUs) {
      toast({
        title: 'Missing information',
        description: 'Please select a reason and whether the client is still with us.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Record the deal lost outcome in activities
      const activityData = {
        type: 'status_change',
        description: JSON.stringify({
          business_outcome: 'deal_lost',
          reason,
          note: notes.trim() || undefined,
          client_still_with_us: clientStillWithUs === 'yes',
          timestamp: new Date().toISOString()
        }),
        lead_id: leadId,
        created_by: user.id
      };

      await supabase.from('activities').insert(activityData);

      if (clientStillWithUs === 'yes') {
        // Restart workflow - reset to new status
        await supabase
          .from('leads')
          .update({
            status: 'new',
            custom_fields: {
              ...((await supabase.from('leads').select('custom_fields').eq('id', leadId).single()).data?.custom_fields as any || {}),
              restarted_from_lost: true,
              previous_lost_reason: reason,
              outcomes_selected: [] // Reset idempotency
            }
          })
          .eq('id', leadId);

        // Create follow-up task for restarted lead
        await supabase.from('calendar_events').insert({
          title: 'Follow-up Restarted Lead',
          event_type: 'task',
          start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          lead_id: leadId,
          agent_id: user.id,
          created_by: user.id,
          description: `Lead workflow restarted after deal lost: ${reason}`,
          status: 'scheduled'
        });

        toast({
          title: 'Lead workflow restarted',
          description: 'Lead has been reset to New status with a follow-up task.',
        });
      } else {
        // Mark as lost and create closure task
        await supabase
          .from('leads')
          .update({ status: 'lost' })
          .eq('id', leadId);

        // Create closure task
        await supabase.from('calendar_events').insert({
          title: 'Lead Closure Documentation',
          event_type: 'task',
          start_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
          lead_id: leadId,
          agent_id: user.id,
          created_by: user.id,
          description: `Document closure for deal lost: ${reason}`,
          status: 'scheduled'
        });

        toast({
          title: 'Lead marked as lost',
          description: 'Closure documentation task has been created.',
        });
      }

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setClientStillWithUs('');
      setReason('');
      setNotes('');
    } catch (error: any) {
      toast({
        title: 'Error processing deal lost workflow',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-destructive" />
            Deal Lost Workflow
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Lead: {leadName}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Why was the deal lost? *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEAL_LOST_REASONS.map((reasonOption) => (
                <Card 
                  key={reasonOption}
                  className={`cursor-pointer transition-all ${
                    reason === reasonOption 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setReason(reasonOption)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full border-2 ${
                        reason === reasonOption
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`} />
                      <span className="text-sm font-medium">{reasonOption}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Client Relationship Status */}
          <Card className="p-4 bg-muted/30">
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Is the client still with us? *
              </Label>
              <RadioGroup 
                value={clientStillWithUs} 
                onValueChange={setClientStillWithUs}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <Card className={`cursor-pointer transition-all ${
                  clientStillWithUs === 'yes' 
                    ? 'ring-2 ring-green-500 bg-green-50' 
                    : 'hover:bg-muted/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="yes" id="yes" />
                      <div>
                        <label htmlFor="yes" className="font-medium text-green-700 cursor-pointer">
                          Yes, restart workflow
                        </label>
                        <p className="text-xs text-green-600 mt-1">
                          Reset to New status with follow-up task
                        </p>
                      </div>
                      <RefreshCw className="h-4 w-4 text-green-600 ml-auto" />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-all ${
                  clientStillWithUs === 'no' 
                    ? 'ring-2 ring-red-500 bg-red-50' 
                    : 'hover:bg-muted/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="no" id="no" />
                      <div>
                        <label htmlFor="no" className="font-medium text-red-700 cursor-pointer">
                          No, close lead
                        </label>
                        <p className="text-xs text-red-600 mt-1">
                          Mark as lost permanently
                        </p>
                      </div>
                      <X className="h-4 w-4 text-red-600 ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              </RadioGroup>
            </div>
          </Card>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context about the deal loss..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || !clientStillWithUs || loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Complete Workflow'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}