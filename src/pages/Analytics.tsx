import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Calendar,
  Award,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface MonthlyData {
  month: string;
  leads: number;
  contacted: number;
  qualified: number;
  converted: number;
}

interface SourceData {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface AgentPerformance {
  name: string;
  email: string;
  agent_id: string;
  leads: number;
  converted: number;
  rate: number;
}

interface FunnelData {
  total: number;
  contacted: number;
  qualified: number;
  converted: number;
}

export const Analytics = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalLeads: 0,
    newLeads: 0,
    convertedLeads: 0,
    activeAgents: 0,
    conversionRate: 0,
    totalProperties: 0,
    totalContacts: 0,
    totalRevenue: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData>({
    total: 0,
    contacted: 0,
    qualified: 0,
    converted: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');

  const getMonthsToFetch = () => {
    switch (timeRange) {
      case '1month': return 1;
      case '3months': return 3;
      case '6months': return 6;
      case '1year': return 12;
      default: return 6;
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch basic counts
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact' });
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: newLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgo.toISOString());
          
        const { count: convertedLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .in('status', ['won', 'converted', 'closed']);

        const { count: totalProperties } = await supabase
          .from('properties')
          .select('id', { count: 'exact' });

        const { count: totalContacts } = await supabase
          .from('contacts')
          .select('id', { count: 'exact' });
        
        // Fetch revenue from deals
        const { data: deals } = await supabase
          .from('deals')
          .select('value')
          .eq('status', 'won');
        
        const totalRevenue = deals?.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0) || 0;
        
        // Fetch active agents
        let activeAgents = 0;
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id);
        const isAdmin = userRoles?.some(ur => ['admin', 'superadmin'].includes(ur.role));
        
        if (isAdmin) {
          const { data: agentRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'agent');
          const agentIds = agentRoles?.map(ur => ur.user_id) || [];
          
          if (agentIds.length > 0) {
            const { count } = await supabase
              .from('profiles')
              .select('user_id', { count: 'exact' })
              .in('user_id', agentIds)
              .eq('status', 'active');
            activeAgents = count || 0;
          }
        }
        
        const conversionRate = totalLeads && totalLeads > 0 
          ? Math.round(((convertedLeads || 0) / totalLeads) * 100) 
          : 0;
        
        setAnalytics({
          totalLeads: totalLeads || 0,
          newLeads: newLeads || 0,
          convertedLeads: convertedLeads || 0,
          activeAgents,
          conversionRate,
          totalProperties: totalProperties || 0,
          totalContacts: totalContacts || 0,
          totalRevenue
        });

        // Fetch monthly trends
        await fetchMonthlyData();
        
        // Fetch source distribution
        await fetchSourceData(totalLeads || 0);
        
        // Fetch agent performance
        await fetchAgentPerformance();
        
        // Fetch funnel data
        await fetchFunnelData();
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchMonthlyData = async () => {
      const months = getMonthsToFetch();
      const monthsData: MonthlyData[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM');

        const { data: leads } = await supabase
          .from('leads')
          .select('status')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const totalLeads = leads?.length || 0;
        const contacted = leads?.filter(l => 
          !['new'].includes(l.status)
        ).length || 0;
        const qualified = leads?.filter(l => 
          ['qualified', 'negotiation', 'negotiating', 'won', 'converted', 'closed'].includes(l.status)
        ).length || 0;
        const converted = leads?.filter(l => 
          ['won', 'converted', 'closed'].includes(l.status)
        ).length || 0;

        monthsData.push({
          month: monthLabel,
          leads: totalLeads,
          contacted,
          qualified,
          converted
        });
      }

      setMonthlyData(monthsData);
    };

    const fetchSourceData = async (totalLeads: number) => {
      const { data: leads } = await supabase
        .from('leads')
        .select('source');

      const sourceCounts: Record<string, number> = {};
      leads?.forEach(lead => {
        const source = lead.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      const formattedData: SourceData[] = Object.entries(sourceCounts).map(([name, count], index) => ({
        name,
        count,
        value: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
        color: colors[index % colors.length]
      }));

      setSourceData(formattedData);
    };

    const fetchAgentPerformance = async () => {
      const { data: agents } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .eq('status', 'active');

      if (!agents) return;

      const performanceData: AgentPerformance[] = [];

      for (const agent of agents) {
        const { data: leads } = await supabase
          .from('leads')
          .select('status')
          .eq('agent_id', agent.user_id);

        const totalLeads = leads?.length || 0;
        const converted = leads?.filter(l => 
          ['won', 'converted', 'closed'].includes(l.status)
        ).length || 0;
        const rate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

        if (totalLeads > 0) {
          performanceData.push({
            name: agent.name,
            email: agent.email,
            agent_id: agent.user_id,
            leads: totalLeads,
            converted,
            rate
          });
        }
      }

      setAgentPerformance(performanceData.sort((a, b) => b.rate - a.rate));
    };

    const fetchFunnelData = async () => {
      const { data: leads } = await supabase
        .from('leads')
        .select('status');

      const total = leads?.length || 0;
      const contacted = leads?.filter(l => 
        !['new'].includes(l.status)
      ).length || 0;
      const qualified = leads?.filter(l => 
        ['qualified', 'negotiation', 'negotiating', 'won', 'converted', 'closed'].includes(l.status)
      ).length || 0;
      const converted = leads?.filter(l => 
        ['won', 'converted', 'closed'].includes(l.status)
      ).length || 0;

      setFunnelData({ total, contacted, qualified, converted });
    };

    fetchAnalytics();

    // Set up real-time subscription
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals'
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track performance and business insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-elevated cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/leads')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{analytics.totalLeads.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/leads')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Award className="w-8 h-8 text-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">New Leads</p>
                  <p className="text-2xl font-bold">{analytics.newLeads}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/properties')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Properties</p>
                  <p className="text-2xl font-bold">{analytics.totalProperties}</p>
                  <p className="text-xs text-muted-foreground">Total listings</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/contacts')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-info" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {profile?.role === 'admin' ? 'Total Contacts' : 'Conversion Rate'}
                  </p>
                  <p className="text-2xl font-bold">
                    {profile?.role === 'admin' ? analytics.totalContacts : `${analytics.conversionRate}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.role === 'admin' ? 'In database' : 'Success rate'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
        </TabsList>

        {/* Lead Analytics */}
        <TabsContent value="leads" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Lead Generation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="leads" fill="hsl(var(--primary))" name="Total Leads" />
                      <Bar dataKey="converted" fill="hsl(var(--success))" name="Converted" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Leads Generated</span>
                    <span>{funnelData.total} (100%)</span>
                  </div>
                  <Progress value={100} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Contacted</span>
                    <span>{funnelData.contacted} ({funnelData.total > 0 ? ((funnelData.contacted / funnelData.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <Progress value={funnelData.total > 0 ? (funnelData.contacted / funnelData.total) * 100 : 0} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Qualified</span>
                    <span>{funnelData.qualified} ({funnelData.total > 0 ? ((funnelData.qualified / funnelData.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <Progress value={funnelData.total > 0 ? (funnelData.qualified / funnelData.total) * 100 : 0} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Converted</span>
                    <span>{funnelData.converted} ({funnelData.total > 0 ? ((funnelData.converted / funnelData.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <Progress value={funnelData.total > 0 ? (funnelData.converted / funnelData.total) * 100 : 0} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lead Sources */}
        <TabsContent value="sources" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Lead Sources Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No source data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Source Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sourceData.length > 0 ? (
                  sourceData.map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="font-medium">{source.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{source.value}%</p>
                        <p className="text-sm text-muted-foreground">
                          {source.count} leads
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No source data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Performance */}
        <TabsContent value="agents" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agent Performance Comparison</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate('/team')}>
                  View All Agents
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {agentPerformance.length > 0 ? (
                <div className="space-y-4">
                  {agentPerformance.map((agent) => (
                    <div key={agent.agent_id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{agent.name}</h4>
                          <p className="text-sm text-muted-foreground">{agent.email}</p>
                        </div>
                        <span className="text-lg font-bold text-primary">{agent.rate}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Leads</p>
                          <p className="font-medium text-lg">{agent.leads}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Converted</p>
                          <p className="font-medium text-lg">{agent.converted}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={agent.rate} className="h-2 flex-1" />
                            <span className="font-medium">{agent.rate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No agent performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Trends */}
        <TabsContent value="revenue" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue Growth</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total Revenue: ${analytics.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'Converted Leads']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="converted" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                      name="Converted Leads"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No revenue data available for selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};