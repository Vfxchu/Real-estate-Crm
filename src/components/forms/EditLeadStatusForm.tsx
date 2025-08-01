import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditLeadStatusFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export const EditLeadStatusForm: React.FC<EditLeadStatusFormProps> = ({ 
  open, 
  onOpenChange, 
  lead 
}) => {
  const { updateLead, addActivity } = useLeads();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Lead['status']>(lead?.status || 'new');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setNotes('');
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setLoading(true);
    try {
      // Update lead status
      await updateLead(lead.id, { status });
      
      // Add activity log
      if (notes.trim()) {
        await addActivity(
          lead.id, 
          'status_change', 
          `Status changed to ${status}. Notes: ${notes.trim()}`
        );
      } else {
        await addActivity(
          lead.id, 
          'status_change', 
          `Status changed to ${status}`
        );
      }

      toast({
        title: 'Lead Updated',
        description: `Lead status has been updated to ${status}.`,
      });

      onOpenChange(false);
      setNotes('');
    } catch (error: any) {
      toast({
        title: 'Error updating lead',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusDescription = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'Initial contact required';
      case 'contacted': return 'First contact made, follow-up needed';
      case 'qualified': return 'Lead shows genuine interest';
      case 'negotiating': return 'In active discussion/negotiation';
      case 'won': return 'Successfully converted to client';
      case 'lost': return 'Did not convert, not interested';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Lead Status</DialogTitle>
        </DialogHeader>
        
        {lead && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{lead.name}</h4>
              <p className="text-sm text-muted-foreground">{lead.email}</p>
              <p className="text-sm text-muted-foreground">{lead.phone}</p>
            </div>

            <div>
              <Label htmlFor="status">Lead Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as Lead['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="won">Converted</SelectItem>
                  <SelectItem value="lost">Not Converted</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {getStatusDescription(status)}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Activity Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this status change..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Status
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};