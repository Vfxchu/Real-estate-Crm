import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { useAgents } from '@/hooks/useAgents';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { LeadsChart } from '@/components/dashboard/LeadsChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import {
  Users,
  Target,
  TrendingUp,
  Shield,
  Settings,
  BarChart3,
  UserCheck,
  Activity,
  ArrowRight,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminPanel = () => {
  const { profile } = useAuth();
  const { leads, loading: leadsLoading } = useLeads();
  const { agents, loading: agentsLoading } = useAgents();

  // Calculate comprehensive admin stats
  const totalLeads = leads.length;
  const newLeads = leads.filter(lead => lead.status === 'new').length;
  const activeLeads = leads.filter(lead => ['contacted', 'qualified', 'negotiating'].includes(lead.status)).length;
  const convertedLeads = leads.filter(lead => lead.status === 'won').length;
  const lostLeads = leads.filter(lead => lead.status === 'lost').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100) : 0;

  const activeAgents = agents.filter(agent => agent.status === 'active').length;
  const totalAgents = agents.length;

  const adminStats = [
    {
      title: 'Total Leads',
      value: totalLeads.toString(),
      change: { value: `+${newLeads} new`, type: 'increase' as const },
      icon: Target,
      description: 'All system leads',
    },
    {
      title: 'Active Agents',
      value: `${activeAgents}/${totalAgents}`,
      change: { value: 'Online', type: 'neutral' as const },
      icon: UserCheck,
      description: 'Team members',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate.toFixed(1)}%`,
      change: { value: `${convertedLeads} won`, type: 'increase' as const },
      icon: TrendingUp,
      description: 'Overall performance',
    },
    {
      title: 'System Health',
      value: '98.5%',
      change: { value: 'Operational', type: 'increase' as const },
      icon: Shield,
      description: 'Platform status',
    },
  ];

  const quickAdminActions = [
    { label: 'Manage Agents', href: '/agents', icon: UserCheck, color: 'bg-primary' },
    { label: 'Lead Assignment', href: '/leads', icon: Target, color: 'bg-info' },
    { label: 'Team Performance', href: '/analytics', icon: BarChart3, color: 'bg-success' },
    { label: 'System Settings', href: '/settings', icon: Settings, color: 'bg-warning' },
  ];

  const recentAlerts = [
    { type: 'warning', message: 'High value lead unassigned for 2 hours', time: '2h ago' },
    { type: 'success', message: 'Agent performance target exceeded', time: '4h ago' },
    { type: 'info', message: 'New automation rule activated', time: '6h ago' },
  ];

  const agentPerformance = agents.slice(0, 5).map(agent => {
    const agentLeads = leads.filter(lead => lead.agent_id === agent.user_id);
    const agentConverted = agentLeads.filter(lead => lead.status === 'won').length;
    const agentActive = agentLeads.filter(lead => ['new', 'contacted', 'qualified'].includes(lead.status)).length;
    
    return {
      ...agent,
      totalLeads: agentLeads.length,
      convertedLeads: agentConverted,
      activeLeads: agentActive,
      conversionRate: agentLeads.length > 0 ? ((agentConverted / agentLeads.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Admin Panel
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            System overview and management dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            System Status
          </Button>
          <Button size="sm" asChild>
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {adminStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Admin Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickAdminActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:scale-105 transition-transform"
                asChild
              >
                <Link to={action.href}>
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm text-center leading-tight">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            <div className="xl:col-span-2">
              <LeadsChart />
            </div>
            <div className="xl:col-span-1">
              <RecentActivity />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agent Performance</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/agents">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformance.map((agent) => (
                  <div key={agent.user_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-muted-foreground">{agent.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{agent.totalLeads} leads</p>
                        <p className="text-xs text-muted-foreground">{agent.convertedLeads} converted</p>
                      </div>
                      <div className="w-20">
                        <Progress value={agent.conversionRate} className="h-2" />
                        <p className="text-xs text-center mt-1">{agent.conversionRate.toFixed(1)}%</p>
                      </div>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  New Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newLeads}</div>
                <p className="text-sm text-muted-foreground">Require assignment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-info" />
                  Active Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeLeads}</div>
                <p className="text-sm text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Converted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{convertedLeads}</div>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Lead Activity</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/leads">
                  Manage All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{lead.status}</Badge>
                      <Badge variant="outline">{lead.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'warning' ? 'bg-warning' :
                      alert.type === 'success' ? 'bg-success' : 'bg-info'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};