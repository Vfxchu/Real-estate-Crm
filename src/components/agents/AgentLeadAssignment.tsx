import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/hooks/useAgents";
import { assignContactToAgent } from "@/services/assignment";
import {
  Search,
  Users,
  Filter,
  UserCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface AgentLeadAssignmentProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentComplete?: () => void;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  priority: string;
  created_at: string;
  agent_id?: string;
}

export const AgentLeadAssignment: React.FC<AgentLeadAssignmentProps> = ({
  agent,
  open,
  onOpenChange,
  onAssignmentComplete,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUnassignedLeads();
    }
  }, [open]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter]);

  const fetchUnassignedLeads = async () => {
    setLoading(true);
    try {
      // Fetch all leads except those assigned to this agent
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or('agent_id.is.null,agent_id.neq.' + agent.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allLeads = data || [];
      const unassignedCount = allLeads.filter(l => !l.agent_id).length;
      const alreadyAssignedCount = allLeads.filter(l => l.agent_id && l.agent_id !== agent.user_id).length;
      
      setLeads(allLeads);
      
      // Show info about filtering
      toast({
        title: 'Leads loaded',
        description: `${unassignedCount} unassigned, ${alreadyAssignedCount} assigned to other agents`,
      });
    } catch (error: any) {
      toast({
        title: 'Error fetching leads',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'unassigned') {
        filtered = filtered.filter(lead => !lead.agent_id);
      } else {
        filtered = filtered.filter(lead => lead.status === statusFilter);
      }
    }

    setFilteredLeads(filtered);
  };

  const handleLeadSelection = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleAssignLeads = async () => {
    if (selectedLeads.length === 0) {
      toast({
        title: 'No leads selected',
        description: 'Please select at least one lead to assign.',
        variant: 'destructive',
      });
      return;
    }

    setAssigning(true);
    try {
      const assignmentPromises = selectedLeads.map(leadId =>
        assignContactToAgent(leadId, agent.user_id)
      );

      const results = await Promise.all(assignmentPromises);
      const failed = results.filter(result => result.error);

      if (failed.length > 0) {
        toast({
          title: 'Partial assignment completed',
          description: `${selectedLeads.length - failed.length} leads assigned successfully. ${failed.length} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Assignment completed',
          description: `${selectedLeads.length} leads assigned to ${agent.name} successfully.`,
        });
      }

      // Refresh leads and reset selection
      await fetchUnassignedLeads();
      setSelectedLeads([]);
      onAssignmentComplete?.();
    } catch (error: any) {
      toast({
        title: 'Assignment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-info text-info-foreground';
      case 'contacted': return 'bg-warning text-warning-foreground';
      case 'qualified': return 'bg-success text-success-foreground';
      case 'negotiating': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assign Leads to {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span className="font-medium">Agent: {agent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Current Leads: {agent.assignedLeads}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Selected:</span>
                  <Badge variant="secondary">{selectedLeads.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search leads by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="unassigned">Unassigned Only</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Leads List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Leads ({filteredLeads.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label className="text-sm">Select All</label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No leads found matching your criteria</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30">
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleLeadSelection(lead.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{lead.name}</p>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                            {lead.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                        {lead.phone && (
                          <p className="text-sm text-muted-foreground">{lead.phone}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                      {lead.agent_id && (
                        <Badge variant="outline">Assigned</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedLeads.length > 0 && (
                <span>
                  {selectedLeads.length} lead{selectedLeads.length === 1 ? '' : 's'} selected for assignment
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignLeads}
                disabled={selectedLeads.length === 0 || assigning}
                className="btn-primary"
              >
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign {selectedLeads.length} Lead{selectedLeads.length === 1 ? '' : 's'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};