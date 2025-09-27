import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, UserX, AlertTriangle } from 'lucide-react';
import { CallOutcomeDialog } from './CallOutcomeDialog';
import { logOutcome } from '@/services/crm';
import { useToast } from '@/hooks/use-toast';

interface QuickCallActionsProps {
  lead: any;
  onComplete: () => void;
}

export function QuickCallActions({ lead, onComplete }: QuickCallActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Don't show actions if lead is already locked to an agent
  if (lead.first_outcome_at) {
    return null;
  }

  const handleQuickAction = async (outcome: 'not_interested' | 'invalid') => {
    setLoading(outcome);
    try {
      await logOutcome({
        leadId: lead.id,
        outcome,
        notes: outcome === 'invalid' ? 'Marked as invalid/spam' : 'Not interested in services'
      });

      toast({
        title: 'Lead updated',
        description: outcome === 'invalid' ? 'Lead marked as invalid/spam' : 'Lead marked as not interested',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Error updating lead',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => setShowDialog(true)}
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        <Phone className="w-4 h-4 mr-2" />
        Call Completed
      </Button>

      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        size="sm"
      >
        <PhoneOff className="w-4 h-4 mr-2" />
        Call Not Completed
      </Button>

      <Button
        onClick={() => handleQuickAction('not_interested')}
        variant="outline"
        size="sm"
        disabled={loading === 'not_interested'}
      >
        <UserX className="w-4 h-4 mr-2" />
        Not Interested
      </Button>

      <Button
        onClick={() => handleQuickAction('invalid')}
        variant="outline"
        size="sm"
        disabled={loading === 'invalid'}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Invalid/Spam
      </Button>

      <CallOutcomeDialog
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        leadId={lead.id}
        leadName={lead.name}
        leadStatus={lead.status}
        onComplete={onComplete}
      />
    </div>
  );
}