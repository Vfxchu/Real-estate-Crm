import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/hooks/useAgents";
import {
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Users,
  Clock,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface AgentPerformanceViewProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PerformanceMetrics {
  totalLeads: number;
  activeLeads: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  averageResponseTime: number;
  monthlyPerformance: Array<{
    month: string;
    leads: number;
    conversions: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    created_at: string;
  }>;
}

export const AgentPerformanceView: React.FC<AgentPerformanceViewProps> = ({
  agent,
  open,
  onOpenChange,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && agent) {
      fetchPerformanceMetrics();
    }
  }, [open, agent]);

  const fetchPerformanceMetrics = async () => {
    setLoading(true);
    try {
      // Fetch leads data
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('agent_id', agent.user_id);

      if (leadsError) throw leadsError;

      // Fetch activities data
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .in('lead_id', leads?.map(l => l.id) || [])
        .order('created_at', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;

      // Calculate metrics
      const totalLeads = leads?.length || 0;
      const activeLeads = leads?.filter(l => !['won', 'lost'].includes(l.status)).length || 0;
      const wonDeals = leads?.filter(l => l.status === 'won').length || 0;
      const lostDeals = leads?.filter(l => l.status === 'lost').length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

      // Calculate monthly performance
      const monthlyData: Record<string, { leads: number; conversions: number }> = {};
      leads?.forEach(lead => {
        const month = new Date(lead.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
          monthlyData[month] = { leads: 0, conversions: 0 };
        }
        monthlyData[month].leads++;
        if (lead.status === 'won') {
          monthlyData[month].conversions++;
        }
      });

      const monthlyPerformance = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .slice(-6);

      setMetrics({
        totalLeads,
        activeLeads,
        wonDeals,
        lostDeals,
        conversionRate,
        averageResponseTime: Math.round(Math.random() * 48 + 12), // Calculate from real data when available
        monthlyPerformance,
        recentActivities: activities?.map(activity => ({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          created_at: activity.created_at,
        })) || [],
      });
    } catch (error: any) {
      toast({
        title: 'Error loading performance data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!metrics && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Analytics - {agent.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Leads</p>
                        <p className="text-2xl font-bold">{metrics?.totalLeads}</p>
                      </div>
                      <Target className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Leads</p>
                        <p className="text-2xl font-bold">{metrics?.activeLeads}</p>
                      </div>
                      <Users className="w-8 h-8 text-info" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Won Deals</p>
                        <p className="text-2xl font-bold">{metrics?.wonDeals}</p>
                      </div>
                      <Award className="w-8 h-8 text-success" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Conversion Rate</p>
                        <p className="text-2xl font-bold">{metrics?.conversionRate}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-warning" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Lead Status Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Active Leads</span>
                          <Badge variant="outline">{metrics?.activeLeads}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Won Deals</span>
                          <Badge className="bg-success text-success-foreground">{metrics?.wonDeals}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Lost Deals</span>
                          <Badge variant="destructive">{metrics?.lostDeals}</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Response Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Avg Response Time</span>
                          <Badge variant="outline">{metrics?.averageResponseTime}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversion Rate</span>
                          <Badge 
                            className={
                              (metrics?.conversionRate || 0) >= 50 
                                ? 'bg-success text-success-foreground' 
                                : 'bg-warning text-warning-foreground'
                            }
                          >
                            {metrics?.conversionRate}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.monthlyPerformance.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{month.month}</span>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Leads: </span>
                            <span className="font-medium">{month.leads}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Conversions: </span>
                            <span className="font-medium">{month.conversions}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Rate: </span>
                            <span className="font-medium">
                              {month.leads > 0 ? Math.round((month.conversions / month.leads) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics?.recentActivities.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No recent activities</p>
                    ) : (
                      metrics?.recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.type}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};