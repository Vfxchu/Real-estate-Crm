import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
} from 'lucide-react';

const leadsData = [
  { month: 'Jan', leads: 65, converted: 12 },
  { month: 'Feb', leads: 78, converted: 18 },
  { month: 'Mar', leads: 90, converted: 22 },
  { month: 'Apr', leads: 81, converted: 19 },
  { month: 'May', leads: 95, converted: 28 },
  { month: 'Jun', leads: 102, converted: 31 },
];

const sourceData = [
  { name: 'Website', value: 35, color: '#3b82f6' },
  { name: 'Referrals', value: 28, color: '#10b981' },
  { name: 'Social Media', value: 20, color: '#f59e0b' },
  { name: 'Walk-ins', value: 17, color: '#ef4444' },
];

const agentPerformance = [
  { name: 'Sarah Johnson', leads: 45, converted: 24, rate: 53.3 },
  { name: 'Mike Chen', leads: 38, converted: 16, rate: 42.1 },
  { name: 'Lisa Rodriguez', leads: 52, converted: 31, rate: 59.6 },
  { name: 'Tom Wilson', leads: 29, converted: 12, rate: 41.4 },
];

export const Analytics = () => {
  const [timeRange, setTimeRange] = useState('6months');

  const totalLeads = 512;
  const convertedLeads = 156;
  const conversionRate = (convertedLeads / totalLeads * 100).toFixed(1);
  const totalRevenue = 2450000;
  const avgDealValue = totalRevenue / convertedLeads;

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
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success">+12.5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success">+3.2%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(totalRevenue / 1000000).toFixed(1)}M</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success">+18.3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Deal Value</p>
                <p className="text-2xl font-bold">${(avgDealValue / 1000).toFixed(0)}K</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-destructive mr-1" />
                  <span className="text-sm text-destructive">-2.1%</span>
                </div>
              </div>
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leadsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="leads" fill="hsl(var(--primary))" name="Total Leads" />
                    <Bar dataKey="converted" fill="hsl(var(--success))" name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
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
                    <span>512 (100%)</span>
                  </div>
                  <Progress value={100} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Contacted</span>
                    <span>423 (82.6%)</span>
                  </div>
                  <Progress value={82.6} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Qualified</span>
                    <span>267 (52.1%)</span>
                  </div>
                  <Progress value={52.1} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Converted</span>
                    <span>156 (30.5%)</span>
                  </div>
                  <Progress value={30.5} className="h-3" />
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
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Source Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sourceData.map((source) => (
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
                        {Math.round(totalLeads * source.value / 100)} leads
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Performance */}
        <TabsContent value="agents" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformance.map((agent) => (
                  <div key={agent.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{agent.name}</h4>
                      <span className="text-lg font-bold text-primary">{agent.rate}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Leads</p>
                        <p className="font-medium">{agent.leads}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Converted</p>
                        <p className="font-medium">{agent.converted}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rate</p>
                        <div className="flex items-center gap-2">
                          <Progress value={agent.rate} className="h-2 flex-1" />
                          <span className="font-medium">{agent.rate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Trends */}
        <TabsContent value="revenue" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${(Number(value) * 15000).toLocaleString()}`, 'Revenue']} />
                  <Line 
                    type="monotone" 
                    dataKey="converted" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};