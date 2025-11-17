import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/hooks/useAgents";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail, validatePhone, escapeHtml } from "@/lib/sanitizer";
import { Loader2, Save, User, BarChart3, Users } from 'lucide-react';

interface AgentEditDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentUpdated?: () => void;
  onViewPerformance?: (agent: Agent) => void;
  onAssignLeads?: (agent: Agent) => void;
}

export const AgentEditDialog: React.FC<AgentEditDialogProps> = ({
  agent,
  open,
  onOpenChange,
  onAgentUpdated,
  onViewPerformance,
  onAssignLeads,
}) => {
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    email: agent?.email || '',
    phone: agent?.phone || '',
    role: agent?.role || 'agent',
    status: agent?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        email: agent.email || '',
        phone: agent.phone || '',
        role: agent.role || 'agent',
        status: agent.status || 'active',
      });
    }
  }, [agent]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusToggle = (checked: boolean) => {
    setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }));
  };

  const handleSave = async () => {
    if (!agent) return;

    setLoading(true);
    try {
      // Validation
      if (!formData.name.trim() || !formData.email.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Name and email are required fields.',
          variant: 'destructive',
        });
        return;
      }

      // Validate email
      try {
        validateEmail(formData.email);
      } catch (error) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address.',
          variant: 'destructive',
        });
        return;
      }

      // Validate phone if provided
      if (formData.phone.trim()) {
        try {
          validatePhone(formData.phone);
        } catch (error) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid phone number.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Update agent in database (no role - managed in user_roles)
      const { error } = await supabase
        .from('profiles')
        .update({
          name: escapeHtml(formData.name.trim()),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', agent.user_id);

      if (error) throw error;

      // Update role in user_roles if changed
      if (formData.role !== agent.role) {
        // Remove old role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', agent.user_id);

        // Add new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: agent.user_id,
            role: formData.role === 'admin' ? 'admin' : 'agent',
          });

        if (roleError) throw roleError;
      }

      toast({
        title: 'Agent updated successfully',
        description: `${formData.name} has been updated.`,
      });

      onAgentUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error updating agent',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Agent - {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Info Form */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Agent Status</Label>
              <p className="text-sm text-muted-foreground">
                {formData.status === 'active' ? 'Agent is active and can receive leads' : 'Agent is inactive and will not receive new leads'}
              </p>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={handleStatusToggle}
            />
          </div>

          {/* Agent Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Assigned Leads</p>
              <p className="text-2xl font-bold">{agent.assignedLeads}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Closed Deals</p>
              <p className="text-2xl font-bold">{agent.closedDeals}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{agent.conversionRate}%</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="btn-primary flex-1" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onViewPerformance?.(agent)}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Performance
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onAssignLeads?.(agent)}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Assign Leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};