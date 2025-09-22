import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, Settings } from 'lucide-react';
import { setupSlaAutomation, triggerSlaSweep } from '@/services/sla-automation';
import { runSlaSweep } from '@/services/crm';
import { useToast } from '@/hooks/use-toast';

export function SlaManagement() {
  const [loading, setLoading] = useState(false);
  const [sweepResults, setSweepResults] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSetupAutomation = async () => {
    setLoading(true);
    try {
      await setupSlaAutomation();
      toast({
        title: 'SLA automation enabled',
        description: 'Automatic lead reassignment is now active (every 5 minutes)',
      });
    } catch (error: any) {
      toast({
        title: 'Error setting up automation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSweep = async () => {
    setLoading(true);
    try {
      const result = await runSlaSweep(30);
      setSweepResults(result);
      
      toast({
        title: 'SLA sweep completed',
        description: `${result} leads were reassigned due to SLA breach`,
      });
    } catch (error: any) {
      toast({
        title: 'Error running SLA sweep',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEdgeFunction = async () => {
    setLoading(true);
    try {
      const result = await triggerSlaSweep();
      setSweepResults(result.reassignedCount);
      
      toast({
        title: 'Edge function test completed',
        description: `${result.reassignedCount} leads were reassigned`,
      });
    } catch (error: any) {
      toast({
        title: 'Error testing edge function',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          SLA Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Service Level Agreement (SLA) for lead assignment and response times.
          Leads are automatically reassigned if no first contact outcome is logged within 30 minutes.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSetupAutomation}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Setup Auto-Assignment
          </Button>

          <Button
            onClick={handleManualSweep}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Manual SLA Sweep
          </Button>

          <Button
            onClick={handleTestEdgeFunction}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Test Edge Function
          </Button>
        </div>

        {sweepResults !== null && (
          <div className="p-3 bg-muted rounded-lg">
            <Badge variant="secondary">
              Last sweep: {sweepResults} leads reassigned
            </Badge>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <strong>SLA Rules:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>New leads are auto-assigned to the least busy agent</li>
            <li>30-minute timer starts on assignment</li>
            <li>If no call outcome is logged, lead is reassigned</li>
            <li>First outcome locks the lead to that agent</li>
            <li>After 3 failed contact attempts, lead is marked as unreachable</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}