import React, { useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LeadsChart } from '@/components/dashboard/LeadsChart';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { AddLeadForm } from '@/components/forms/AddLeadForm';
import { WhatsAppFloatingButton } from '@/components/chat/WhatsAppFloatingButton';
import { WhatsAppChat } from '@/components/chat/WhatsAppChat';
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
  const isAdmin = profile?.role === 'admin';
  const [addLeadFormOpen, setAddLeadFormOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedChatLead, setSelectedChatLead] = useState<{name: string, phone?: string} | null>(null);

  // Mock data - replace with real data
  const adminStats = [
    {
      title: 'Total Leads',
      value: '1,247',
      change: { value: '+12%', type: 'increase' as const },
      icon: Target,
      description: 'This month',
    },
    {
      title: 'Active Agents',
      value: '24',
      change: { value: '+2', type: 'increase' as const },
      icon: Users,
      description: 'Currently active',
    },
    {
      title: 'Conversion Rate',
      value: '24.5%',
      change: { value: '+2.1%', type: 'increase' as const },
      icon: TrendingUp,
      description: 'This month',
    },
    {
      title: 'Appointments',
      value: '89',
      change: { value: '+15%', type: 'increase' as const },
      icon: Calendar,
      description: 'This week',
    },
  ];

  const agentStats = [
    {
      title: 'My Leads',
      value: '42',
      change: { value: '+5', type: 'increase' as const },
      icon: Target,
      description: 'Active leads',
    },
    {
      title: 'Calls Today',
      value: '8',
      change: { value: '+2', type: 'increase' as const },
      icon: Phone,
      description: 'Completed',
    },
    {
      title: 'Conversion Rate',
      value: '28%',
      change: { value: '+3%', type: 'increase' as const },
      icon: TrendingUp,
      description: 'This month',
    },
    {
      title: 'Next Appointment',
      value: '2:30 PM',
      change: { value: 'Today', type: 'neutral' as const },
      icon: Calendar,
      description: 'Property viewing',
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
            {[
              {
                name: 'John Smith',
                email: 'john.smith@email.com',
                phone: '+1 (555) 123-4567',
                status: 'new',
                priority: 'high',
                agent: isAdmin ? 'Sarah Agent' : undefined,
              },
              {
                name: 'Maria Garcia',
                email: 'maria.garcia@email.com',
                phone: '+1 (555) 234-5678',
                status: 'contacted',
                priority: 'medium',
                agent: isAdmin ? 'Mike Agent' : undefined,
              },
              {
                name: 'David Wilson',
                email: 'david.wilson@email.com',
                phone: '+1 (555) 345-6789',
                status: 'interested',
                priority: 'high',
                agent: isAdmin ? 'Lisa Agent' : undefined,
              },
            ].map((lead, index) => (
              <div
                key={index}
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
                          : 'bg-success text-success-foreground'
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
                  {isAdmin && lead.agent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned to: {lead.agent}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Lead Form */}
      <AddLeadForm 
        open={addLeadFormOpen} 
        onOpenChange={setAddLeadFormOpen} 
      />

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
          // For demo, use first lead or a default
          const demoLead = { name: 'John Smith', phone: '+1 (555) 123-4567' };
          setSelectedChatLead(demoLead);
          setChatOpen(true);
        }}
      />
    </div>
  );
};