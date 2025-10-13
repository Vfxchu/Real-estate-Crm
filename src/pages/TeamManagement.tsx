import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserCheck,
  Target,
  TrendingUp,
  ArrowRight,
  Contact,
  Building,
  DollarSign,
  BarChart3,
  Settings,
  Plus,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { useLeads } from '@/hooks/useLeads';
import { useDeals } from '@/hooks/useDeals';
import { useToast } from '@/hooks/use-toast';
import { getAgentStatistics } from '@/services/assignment';
import { AddAgentForm } from '@/components/forms/AddAgentForm';
import { isFieldMasked, getMaskedFieldMessage } from '@/utils/profilePermissions';

interface AgentStats {
  agent_id: string;
  name: string;
  email: string;
  phone?: string | null;
  total_leads: number;
  active_leads: number;
  deals_count?: number;
  deals_value?: number;
}

export const TeamManagement = () => {
  const { agents, loading: agentsLoading } = useAgents();
  const { leads, loading: leadsLoading } = useLeads();
  const { deals, loading: dealsLoading } = useDeals();
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await getAgentStatistics();
      if (error) {
        toast({
          title: 'Error fetching statistics',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      setAgentStats(data || []);
    };

    fetchStats();
  }, [toast]);

  // Calculate overall team metrics
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalLeads = leads.length;
  const totalDeals = deals.length;
  const activeDealValue = deals
    .filter(deal => ['prospecting', 'qualified', 'proposal', 'negotiation'].includes(deal.status))
    .reduce((sum, deal) => sum + (deal.value || 0), 0);

  // Lead distribution data
  const leadDistribution = agentStats.map(stat => ({
    ...stat,
    workload_percentage: totalLeads > 0 ? (stat.active_leads / totalLeads) * 100 : 0,
  }));

  const getWorkloadColor = (percentage: number) => {
    if (percentage < 15) return 'bg-green-500';
    if (percentage < 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderConnectionsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Contacts Flow */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Contact className="w-5 h-5 text-primary" />
            Contact Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New Contacts Today</span>
              <Badge variant="secondary">
                {leads.filter(lead => {
                  const today = new Date().toDateString();
                  return new Date(lead.created_at || '').toDateString() === today;
                }).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto-Assigned</span>
              <Badge variant="outline">Round-Robin Active</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Assignment Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Flow */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-blue-500" />
            Deal Ownership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Deals</span>
              <Badge variant="secondary">{totalDeals}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pipeline Value</span>
              <Badge variant="outline">${(activeDealValue / 1000).toFixed(0)}K</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Reassign Deals
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Properties Connection */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="w-5 h-5 text-green-500" />
            Property Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Linked Properties</span>
              <Badge variant="secondary">
                {deals.filter(deal => deal.property_id).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agent Coverage</span>
              <Badge variant="outline">100%</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Manage Assignments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Security Notice Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Collaborative Team Environment
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Team members can view colleague names and emails for effective collaboration. 
                Phone numbers remain private and are only visible to profile owners and administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">
            Central hub connecting agents to contacts, deals, and properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Assignment Rules
          </Button>
          <Button className="btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{totalAgents}</p>
                <p className="text-xs text-green-600">{activeAgents} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Contact className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Managed Contacts</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-xs text-blue-600">Auto-distributed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
                <p className="text-xs text-green-600">Agent-owned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">${(activeDealValue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-yellow-600">In progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          System Connections
        </h2>
        {renderConnectionsOverview()}
      </div>

      {/* Team Management Tabs */}
      <Tabs defaultValue="distribution" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="distribution">Lead Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="assignments">Deal Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Lead Distribution & Workload Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Active Leads</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadDistribution.map((agent) => (
                    <TableRow key={agent.agent_id}>
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
                            {agent.phone && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      {agent.phone}
                                      {isFieldMasked(agent.phone) && (
                                        <EyeOff className="w-3 h-3 text-blue-500" />
                                      )}
                                    </p>
                                  </TooltipTrigger>
                                  {isFieldMasked(agent.phone) && (
                                    <TooltipContent>
                                      <p className="flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        {getMaskedFieldMessage('phone')}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{agent.total_leads}</TableCell>
                      <TableCell>{agent.active_leads}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={agent.workload_percentage} 
                            className="w-20" 
                          />
                          <span className="text-sm">
                            {agent.workload_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getWorkloadColor(agent.workload_percentage)} text-white`}
                        >
                          {agent.workload_percentage < 15 ? 'Light' : 
                           agent.workload_percentage < 25 ? 'Balanced' : 'Heavy'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            Reassign
                          </Button>
                          <Button size="sm" variant="outline">
                            View Contacts
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Deals Created</TableHead>
                    <TableHead>Deals Won</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => {
                    const agentLeads = leads.filter(lead => lead.agent_id === agent.user_id);
                    const agentDeals = deals.filter(deal => deal.agent_id === agent.user_id);
                    const wonDeals = agentDeals.filter(deal => deal.status === 'closed_won');
                    const conversionRate = agentLeads.length > 0 ? 
                      (wonDeals.length / agentLeads.length) * 100 : 0;
                    const totalValue = agentDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

                    return (
                      <TableRow key={agent.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {agent.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                  {agent.role}
                                </Badge>
                                {agent.phone && isFieldMasked(agent.phone) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                                          <Shield className="w-3 h-3 mr-1" />
                                          Phone Protected
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Phone number is protected for privacy</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{agentLeads.length}</TableCell>
                        <TableCell>{agentDeals.length}</TableCell>
                        <TableCell>{wonDeals.length}</TableCell>
                        <TableCell>
                          <span className={conversionRate >= 20 ? 'text-green-600' : 'text-yellow-600'}>
                            {conversionRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>${(totalValue / 1000).toFixed(0)}K</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deal Assignments & Ownership</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.slice(0, 10).map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(deal.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {deal.leads?.name || 'Unknown Contact'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {deal.profiles?.name?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{deal.profiles?.name || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={deal.status.includes('closed') ? 'default' : 'secondary'}
                        >
                          {deal.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${deal.value ? (deal.value / 1000).toFixed(0) + 'K' : 'TBD'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          Reassign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Agent Form */}
      <AddAgentForm 
        open={showAddForm} 
        onOpenChange={setShowAddForm}
        onAgentCreated={() => {
          toast({
            title: 'Agent added successfully',
            description: 'The new agent has been added to the team and will receive lead assignments.',
          });
          setShowAddForm(false);
        }}
      />
    </div>
  );
};