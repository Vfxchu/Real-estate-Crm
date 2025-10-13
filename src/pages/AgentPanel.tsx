import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { useNavigate, Link } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import LeadForm from "@/components/leads/LeadForm";
import { EditLeadStatusForm } from '@/components/forms/EditLeadStatusForm';
import { WhatsAppChat } from '@/components/chat/WhatsAppChat';
import {
  Target,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  MessageSquare,
  ArrowRight,
  User,
} from 'lucide-react';

export const AgentPanel = () => {
  const { user, profile } = useAuth();
  const { leads, loading, fetchLeads } = useLeads();
  const navigate = useNavigate();
  const [addLeadFormOpen, setAddLeadFormOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [selectedEditLead, setSelectedEditLead] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedChatLead, setSelectedChatLead] = useState<{name: string, phone?: string} | null>(null);

  // Filter leads for current agent
  const myLeads = leads.filter(lead => lead.agent_id === user?.id);
  const newLeads = myLeads.filter(lead => lead.status === 'new');
  const contactedLeads = myLeads.filter(lead => lead.status === 'contacted');
  const qualifiedLeads = myLeads.filter(lead => lead.status === 'qualified');
  const convertedLeads = myLeads.filter(lead => lead.status === 'won');
  const lostLeads = myLeads.filter(lead => lead.status === 'lost');

  const totalLeads = myLeads.length;
  const activeLeads = myLeads.filter(lead => ['new', 'contacted', 'qualified', 'negotiating'].includes(lead.status)).length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads.length / totalLeads) * 100) : 0;

  // Calculate tasks for today
  const todayFollowUps = myLeads.filter(lead => {
    if (!lead.follow_up_date) return false;
    const today = new Date().toDateString();
    const followUpDate = new Date(lead.follow_up_date).toDateString();
    return followUpDate === today;
  });

  const agentStats = [
    {
      title: 'My Leads',
      value: totalLeads.toString(),
      change: { value: `${newLeads.length} new`, type: 'increase' as const },
      icon: Target,
      description: 'Total assigned',
    },
    {
      title: 'Active Leads',
      value: activeLeads.toString(),
      change: { value: 'In progress', type: 'neutral' as const },
      icon: Clock,
      description: 'Being worked',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate.toFixed(1)}%`,
      change: { value: `${convertedLeads.length} won`, type: 'increase' as const },
      icon: TrendingUp,
      description: 'Personal rate',
    },
    {
      title: 'Today\'s Tasks',
      value: todayFollowUps.length.toString(),
      change: { value: 'Follow-ups', type: 'neutral' as const },
      icon: Calendar,
      description: 'Due today',
    },
  ];

  const quickAgentActions = [
    { 
      label: 'Add New Lead', 
      icon: Plus, 
      color: 'bg-primary', 
      action: () => setAddLeadFormOpen(true) 
    },
    { 
      label: 'Make a Call', 
      icon: Phone, 
      color: 'bg-success', 
      action: () => {
        const leadWithPhone = myLeads.find(l => l.phone && ['new', 'contacted'].includes(l.status));
        if (leadWithPhone) {
          setSelectedChatLead({ name: leadWithPhone.name, phone: leadWithPhone.phone });
          setChatOpen(true);
        } else {
          navigate('/my-leads');
        }
      }
    },
    { 
      label: 'Send Email', 
      icon: Mail, 
      color: 'bg-info', 
      action: () => navigate('/communication')
    },
    { 
      label: 'Schedule Meeting', 
      icon: Calendar, 
      color: 'bg-warning', 
      action: () => navigate('/calendar')
    },
  ];

  const priorityLeads = myLeads
    .filter(lead => lead.priority === 'high' && ['new', 'contacted'].includes(lead.status))
    .slice(0, 3);

  const recentActivity = myLeads
    .filter(lead => lead.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Agent Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your personal lead management workspace
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/my-leads">
              <Target className="w-4 h-4 mr-2" />
              View All Leads
            </Link>
          </Button>
          <Button size="sm" onClick={() => setAddLeadFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {agentStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickAgentActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:scale-105 transition-transform"
                onClick={action.action}
              >
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <span className="text-xs sm:text-sm text-center leading-tight">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads">My Leads</TabsTrigger>
          <TabsTrigger value="tasks">Today's Tasks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  New Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newLeads.length}</div>
                <p className="text-sm text-muted-foreground">Need first contact</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-info" />
                  Contacted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contactedLeads.length}</div>
                <p className="text-sm text-muted-foreground">Following up</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Qualified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualifiedLeads.length}</div>
                <p className="text-sm text-muted-foreground">Ready to close</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Converted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{convertedLeads.length}</div>
                <p className="text-sm text-muted-foreground">Won deals</p>
              </CardContent>
            </Card>
          </div>

          {priorityLeads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  High Priority Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priorityLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                        {lead.phone && (
                          <p className="text-sm text-muted-foreground">{lead.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">High Priority</Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedChatLead({ name: lead.name, phone: lead.phone });
                            setChatOpen(true);
                          }}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedEditLead(lead);
                            setEditLeadOpen(true);
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              {todayFollowUps.length > 0 ? (
                <div className="space-y-3">
                  {todayFollowUps.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Follow-up scheduled for today
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{lead.status}</Badge>
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No follow-ups scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lead Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">New</span>
                  <span className="text-sm font-medium">{newLeads.length}</span>
                </div>
                <Progress value={(newLeads.length / Math.max(totalLeads, 1)) * 100} />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Contacted</span>
                  <span className="text-sm font-medium">{contactedLeads.length}</span>
                </div>
                <Progress value={(contactedLeads.length / Math.max(totalLeads, 1)) * 100} />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Qualified</span>
                  <span className="text-sm font-medium">{qualifiedLeads.length}</span>
                </div>
                <Progress value={(qualifiedLeads.length / Math.max(totalLeads, 1)) * 100} />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Converted</span>
                  <span className="text-sm font-medium">{convertedLeads.length}</span>
                </div>
                <Progress value={(convertedLeads.length / Math.max(totalLeads, 1)) * 100} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Conversion Rate</span>
                  <span className="text-sm font-medium">{conversionRate.toFixed(1)}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <span className="text-sm font-medium">&lt; 2 hours</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Follow-up Compliance</span>
                  <span className="text-sm font-medium">95%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Customer Satisfaction</span>
                  <span className="text-sm font-medium">4.8/5</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Updated {lead.name} - Status: {lead.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.updated_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Lead Form */}
      <Dialog open={addLeadFormOpen} onOpenChange={setAddLeadFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <LeadForm
              context="agent"
              onSuccess={async () => {
                await fetchLeads();
                setAddLeadFormOpen(false);
              }}
            />
          </div>
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
    </div>
  );
};