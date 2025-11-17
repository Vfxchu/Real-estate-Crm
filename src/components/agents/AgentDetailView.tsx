import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Agent } from "@/hooks/useAgents";
import { AgentLeadsTab } from "./AgentLeadsTab";
import { AgentContactsTab } from "./AgentContactsTab";
import { AgentPropertiesTab } from "./AgentPropertiesTab";
import { AgentPerformanceChart } from "./AgentPerformanceChart";
import { 
  User, 
  Mail, 
  Phone, 
  TrendingUp, 
  Target, 
  Award,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AgentDetailViewProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({
  agent,
  open,
  onOpenChange,
}) => {
  const [realtimeLeads, setRealtimeLeads] = useState(agent.assignedLeads);
  const [realtimeDeals, setRealtimeDeals] = useState(agent.closedDeals);

  useEffect(() => {
    if (!open) return;

    // Real-time subscription for leads
    const leadsChannel = supabase
      .channel('agent-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `agent_id=eq.${agent.user_id}`,
        },
        () => {
          // Refetch stats when leads change
          fetchAgentStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [open, agent.user_id]);

  const fetchAgentStats = async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('status')
      .eq('agent_id', agent.user_id);

    const assignedLeads = leads?.filter(l => ['new', 'contacted', 'qualified', 'negotiating'].includes(l.status)).length || 0;
    const closedDeals = leads?.filter(l => l.status === 'won').length || 0;

    setRealtimeLeads(assignedLeads);
    setRealtimeDeals(closedDeals);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const conversionRate = realtimeLeads > 0 ? Math.round((realtimeDeals / realtimeLeads) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agent Profile</DialogTitle>
        </DialogHeader>

        {/* Agent Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(agent.name)}
              </AvatarFallback>
            </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{agent.name}</h2>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                  <Badge variant="outline">
                    {agent.role === 'admin' ? 'Administrator' : 'Agent'}
                  </Badge>
                </div>

                <div className="space-y-2 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{agent.email}</span>
                  </div>
                  {agent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <div className="text-2xl font-bold">{realtimeLeads}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Active Leads</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Award className="h-4 w-4 text-green-600" />
                    <div className="text-2xl font-bold">{realtimeDeals}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Closed Deals</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <div className="text-2xl font-bold">{conversionRate}%</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Conversion</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="leads" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-4">
            <AgentLeadsTab agentId={agent.user_id} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <AgentContactsTab agentId={agent.user_id} />
          </TabsContent>

          <TabsContent value="properties" className="mt-4">
            <AgentPropertiesTab agentId={agent.user_id} />
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <AgentPerformanceChart agentId={agent.user_id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
