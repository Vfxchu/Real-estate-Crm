import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddAgentForm } from "@/components/forms/AddAgentForm";
import { AgentLeadsTable } from "@/components/agents/AgentLeadsTable";
import { AgentPerformanceView } from "@/components/agents/AgentPerformanceView";
import { AgentLeadAssignment } from "@/components/agents/AgentLeadAssignment";
import { AgentEditDialog } from "@/components/agents/AgentEditDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  UserCheck,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgents, type Agent } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';

export const AgentManager = () => {
  const { agents, loading, updateAgent, deleteAgent, fetchAgents } = useAgents();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPerformanceView, setShowPerformanceView] = useState(false);
  const [showLeadAssignment, setShowLeadAssignment] = useState(false);
  const { toast } = useToast();

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleColor = (role: Agent['role']) => {
    switch (role) {
      case 'lead': return 'border-primary text-primary';
      case 'senior': return 'border-success text-success';
      case 'junior': return 'border-info text-info';
      default: return 'border-muted-foreground text-muted-foreground';
    }
  };

  const handleAgentActivation = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    
    try {
      await updateAgent(agent.user_id, { status: newStatus });
      toast({
        title: 'Agent status updated',
        description: `${agent.name} is now ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating agent status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (window.confirm(`Are you sure you want to deactivate ${agent.name}? This action will set their status to inactive.`)) {
      try {
        await deleteAgent(agent.user_id);
        toast({
          title: 'Agent deactivated',
          description: `${agent.name} has been deactivated.`,
        });
      } catch (error: any) {
        toast({
          title: 'Error deactivating agent',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowEditDialog(true);
  };

  const openPerformanceView = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowPerformanceView(true);
  };

  const openLeadAssignment = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowLeadAssignment(true);
  };

  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalLeads = agents.reduce((sum, a) => sum + (a.assignedLeads || 0), 0);
  const totalClosedDeals = agents.reduce((sum, a) => sum + a.closedDeals, 0);

  const handleAgentUpdate = () => {
    fetchAgents();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agent Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive agent and lead management with real-time updates
          </p>
        </div>
        <Button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Agent
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold">{activeAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Closed Deals</p>
                <p className="text-2xl font-bold">{totalClosedDeals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agents Management
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Lead Assignment
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Analytics
          </TabsTrigger>
        </TabsList>

        {/* Agents Management Tab */}
        <TabsContent value="agents" className="space-y-6">
          {/* Filters */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search agents by name or email..."
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
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Agents Table */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Agents ({filteredAgents.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Deals</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.user_id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {agent.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-sm text-muted-foreground">{agent.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">{agent.phone}</p>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0"
                                onClick={() => agent.phone && window.open(`tel:${agent.phone}`)}
                                disabled={!agent.phone}
                              >
                                <Phone className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0"
                                onClick={() => window.open(`mailto:${agent.email}`)}
                              >
                                <Mail className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(agent.status)}>
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleColor(agent.role)}>
                            {agent.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{agent.assignedLeads}</TableCell>
                        <TableCell>{agent.closedDeals}</TableCell>
                        <TableCell>
                          <span className={agent.conversionRate >= 50 ? 'text-success' : 'text-warning'}>
                            {agent.conversionRate}%
                          </span>
                        </TableCell>
                        <TableCell>{new Date(agent.updated_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(agent)}
                              title="Edit Agent"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openPerformanceView(agent)}
                              title="View Performance"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openLeadAssignment(agent)}
                              title="Assign Leads"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-8 w-8 p-0 ${agent.status === 'active' ? 'text-warning' : 'text-success'}`}
                              onClick={() => handleAgentActivation(agent)}
                              title={agent.status === 'active' ? 'Deactivate Agent' : 'Activate Agent'}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => handleDeleteAgent(agent)}
                              title="Delete Agent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Assignment Tab */}
        <TabsContent value="leads">
          <AgentLeadsTable 
            agents={agents} 
            onLeadUpdate={handleAgentUpdate}
          />
        </TabsContent>

        {/* Performance Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Detailed performance analytics and reporting coming soon.
                  This will include conversion rates, revenue tracking, and team performance metrics.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Agent Form */}
      <AddAgentForm 
        open={showAddForm} 
        onOpenChange={setShowAddForm}
        onAgentCreated={handleAgentUpdate}
      />

      {/* Agent Edit Dialog */}
      <AgentEditDialog
        agent={selectedAgent}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onAgentUpdated={handleAgentUpdate}
        onViewPerformance={openPerformanceView}
        onAssignLeads={openLeadAssignment}
      />

      {/* Agent Performance View */}
      {selectedAgent && (
        <AgentPerformanceView
          agent={selectedAgent}
          open={showPerformanceView}
          onOpenChange={setShowPerformanceView}
        />
      )}

      {/* Agent Lead Assignment */}
      {selectedAgent && (
        <AgentLeadAssignment
          agent={selectedAgent}
          open={showLeadAssignment}
          onOpenChange={setShowLeadAssignment}
          onAssignmentComplete={handleAgentUpdate}
        />
      )}
    </div>
  );
};