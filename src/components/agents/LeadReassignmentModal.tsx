import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lead } from "@/types";
import { Agent } from "@/hooks/useAgents";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserX, ArrowRight, Clock } from "lucide-react";

interface LeadReassignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  agents: Agent[];
  onReassignComplete: () => void;
}

export const LeadReassignmentModal: React.FC<LeadReassignmentModalProps> = ({
  open,
  onOpenChange,
  lead,
  agents,
  onReassignComplete,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Reset selected agent when modal opens with new lead
  useEffect(() => {
    if (open && lead) {
      setSelectedAgentId('');
    }
  }, [open, lead]);

  const currentAgent = lead?.agent_id ? agents.find(a => a.user_id === lead.agent_id) : null;
  const availableAgents = agents.filter(a => a.status === 'active' && a.user_id !== lead?.agent_id);

  const handleReassign = async () => {
    if (!lead || !selectedAgentId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          agent_id: selectedAgentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;

      // Add activity record
      const selectedAgent = agents.find(a => a.user_id === selectedAgentId);
      await supabase
        .from('activities')
        .insert({
          lead_id: lead.id,
          type: 'assignment',
          description: `Lead reassigned to ${selectedAgent?.name || 'agent'}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      toast({
        title: 'Lead reassigned successfully',
        description: `${lead.name} has been assigned to ${selectedAgent?.name}`,
      });

      onReassignComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error reassigning lead',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Reassign Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Lead Details</h4>
            <div className="space-y-2">
              <p className="text-sm"><strong>Name:</strong> {lead.name}</p>
              <p className="text-sm"><strong>Email:</strong> {lead.email}</p>
              <p className="text-sm">
                <strong>Status:</strong> 
                <Badge variant="outline" className="ml-2">
                  {lead.status}
                </Badge>
              </p>
            </div>
          </div>

          {/* Current Assignment */}
          {currentAgent && (
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Avatar>
                <AvatarFallback>
                  {currentAgent.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">Currently assigned to</p>
                <p className="text-sm text-muted-foreground">{currentAgent.name}</p>
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {/* Agent Selection */}
          <div className="space-y-3">
            <Label>Reassign to Agent</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.user_id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {agent.assignedLeads} leads
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleReassign}
              disabled={!selectedAgentId || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                "Reassigning..."
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Reassign Lead
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};