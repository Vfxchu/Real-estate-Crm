import React, { useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LeadsChart } from '@/components/dashboard/LeadsChart';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import LeadForm from "@/components/leads/LeadForm";
import { WhatsAppFloatingButton } from '@/components/chat/WhatsAppFloatingButton';
import { WhatsAppChat } from '@/components/chat/WhatsAppChat';
import { EditLeadStatusForm } from '@/components/forms/EditLeadStatusForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Target,
  Users,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  ArrowRight,
} from 'lucide-react';

export const Dashboard = () => {
  const { user, profile } = useAuth();
  const { leads, loading, fetchLeads } = useLeads();
  const isAdmin = profile?.role === 'admin';
  const [addLeadFormOpen, setAddLeadFormOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedChatLead, setSelectedChatLead] = useState<{name: string, phone?: string} | null>(null);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [selectedEditLead, setSelectedEditLead] = useState<any>(null);

  // Calculate real stats from data
  const totalLeads = leads.length;
  const myLeads = isAdmin ? totalLeads : leads.filter(lead => lead.agent_id === user?.id).length;
  const newLeads = leads.filter(lead => lead.status === 'new').length;
  const convertedLeads = leads.filter(lead => lead.status === 'won').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

  const adminStats = [
    {
      title: 'Total Leads',
      value: totalLeads.toString(),
      change: { value: `+${newLeads}`, type: 'increase' as const },
      icon: Target,
      description: 'All leads',
    },
    {
      title: 'New Leads',
      value: newLeads.toString(),
      change: { value: 'Today', type: 'neutral' as const },
      icon: Users,
      description: 'Requiring attention',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      change: { value: `${convertedLeads} won`, type: 'increase' as const },
      icon: TrendingUp,
      description: 'Overall',
    },
    {
      title: 'Active Leads',
      value: leads.filter(lead => ['new', 'contacted', 'qualified'].includes(lead.status)).length.toString(),
      change: { value: 'In progress', type: 'neutral' as const },
      icon: Calendar,
      description: 'Being processed',
    },
  ];

  const agentStats = [
    {
      title: 'My Leads',
      value: myLeads.toString(),
      change: { value: 'Assigned', type: 'neutral' as const },
      icon: Target,
      description: 'Total assigned',
    },
    {
      title: 'New Leads',
      value: leads.filter(lead => lead.agent_id === user?.id && lead.status === 'new').length.toString(),
      change: { value: 'Require attention', type: 'neutral' as const },
      icon: Phone,
      description: 'To contact',
    },
    {
      title: 'In Progress',
      value: leads.filter(lead => lead.agent_id === user?.id && ['contacted', 'qualified'].includes(lead.status)).length.toString(),
      change: { value: 'Active', type: 'increase' as const },
      icon: TrendingUp,
      description: 'Being worked',
    },
    {
      title: 'Converted',
      value: leads.filter(lead => lead.agent_id === user?.id && lead.status === 'won').length.toString(),
      change: { value: 'Success', type: 'increase' as const },
      icon: Calendar,
      description: 'Closed deals',
    },
  ];

  const stats = isAdmin ? adminStats : agentStats;

  const quickActions = isAdmin
    ? [
        { label: 'Add New Lead', icon: Plus, color: 'bg-primary' },
        { label: 'View All Leads', icon: Target, color: 'bg-info' },
        { label: 'Agent Performance', icon: Users, color: 'bg-success' },
        { label: 'Communication Logs', icon: MessageSquare, color: 'bg-warning' },
      ]
    : [
        { label: 'Add New Lead', icon: Plus, color: 'bg-primary' },
        { label: 'Make a Call', icon: Phone, color: 'bg-success' },
        { label: 'Send Email', icon: Mail, color: 'bg-info' },
        { label: 'Schedule Meeting', icon: Calendar, color: 'bg-warning' },
      ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Here's what's happening with your team today."
              : "Here's your lead activity for today."
            }
          </p>
        </div>
        <Button className="btn-primary" onClick={() => setAddLeadFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex-col gap-2 hover:scale-105 transition-transform"
                onClick={() => {
                  if (action.label === 'Add New Lead') {
                    setAddLeadFormOpen(true);
                  }
                }}
              >
                <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <LeadsChart />
        </div>

        {/* Recent Activity - Takes 1 column */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>

      {/* Recent Leads/Tasks */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isAdmin ? 'Recent Leads' : 'My Active Leads'}
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leads.slice(0, 3).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        lead.status === 'new'
                          ? 'bg-info text-info-foreground'
                          : lead.status === 'contacted'
                          ? 'bg-warning text-warning-foreground'
                          : lead.status === 'qualified'
                          ? 'bg-success text-success-foreground'
                          : lead.status === 'won'
                          ? 'bg-success text-success-foreground'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {lead.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        lead.priority === 'high'
                          ? 'border-destructive text-destructive'
                          : 'border-muted-foreground text-muted-foreground'
                      }
                    >
                      {lead.priority} priority
                    </Badge>
                  </div>
                  {isAdmin && lead.profiles?.name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned to: {lead.profiles.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setSelectedChatLead({ name: lead.name, phone: lead.phone });
                      setChatOpen(true);
                    }}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedEditLead(lead);
                      setEditLeadOpen(true);
                    }}
                  >
                    Update Status
                  </Button>
                </div>
              </div>
            ))}
            {leads.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No leads found. Add your first lead to get started!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Lead Form */}
      <Dialog open={addLeadFormOpen} onOpenChange={setAddLeadFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            context="admin"
            onSuccess={async () => {
              await fetchLeads();
              setAddLeadFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Lead Status Form */}
      {selectedEditLead && (
        <EditLeadStatusForm
          open={editLeadOpen}
          onOpenChange={setEditLeadOpen}
          lead={selectedEditLead}
        />
      )}

      {/* WhatsApp Chat */}
      {selectedChatLead && (
        <WhatsAppChat
          open={chatOpen}
          onOpenChange={setChatOpen}
          leadName={selectedChatLead.name}
          leadPhone={selectedChatLead.phone}
        />
      )}

      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton 
        onClick={() => {
          if (leads.length > 0) {
            const firstLead = leads[0];
            setSelectedChatLead({ name: firstLead.name, phone: firstLead.phone });
          } else {
            // Set fallback demo lead only if no real leads exist
            setSelectedChatLead({ name: 'Demo Contact', phone: '+1 (555) 123-4567' });
          }
          setChatOpen(true);
        }}
      />
    </div>
  );
};