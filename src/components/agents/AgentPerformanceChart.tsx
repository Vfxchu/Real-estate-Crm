import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Award, Target, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AgentPerformanceChartProps {
  agentId: string;
}

export const AgentPerformanceChart: React.FC<AgentPerformanceChartProps> = ({ agentId }) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    wonDeals: 0,
    lostDeals: 0,
    conversionRate: 0,
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    fetchPerformanceData();
  }, [agentId]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      // Fetch all leads for this agent
      const { data: leads, error } = await supabase
        .from('leads')
        .select('status, created_at')
        .eq('agent_id', agentId);

      if (error) throw error;

      // Calculate stats
      const total = leads?.length || 0;
      const active = leads?.filter(l => ['new', 'contacted', 'qualified', 'negotiating'].includes(l.status)).length || 0;
      const won = leads?.filter(l => l.status === 'won').length || 0;
      const lost = leads?.filter(l => l.status === 'lost').length || 0;
      const conversion = total > 0 ? Math.round((won / total) * 100) : 0;

      setStats({
        totalLeads: total,
        activeLeads: active,
        wonDeals: won,
        lostDeals: lost,
        conversionRate: conversion,
      });

      // Status breakdown for pie chart
      const statusCount: Record<string, number> = {};
      leads?.forEach(lead => {
        statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
      });

      const pieData = Object.entries(statusCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
      setStatusBreakdown(pieData);

      // Monthly performance data
      const monthlyData: Record<string, { month: string; leads: number; won: number }> = {};
      leads?.forEach(lead => {
        const month = new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
          monthlyData[month] = { month, leads: 0, won: 0 };
        }
        monthlyData[month].leads += 1;
        if (lead.status === 'won') {
          monthlyData[month].won += 1;
        }
      });

      const chartData = Object.values(monthlyData).slice(-6); // Last 6 months
      setPerformanceData(chartData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
            </div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">{stats.activeLeads}</div>
            </div>
            <div className="text-sm text-muted-foreground">Active Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">{stats.wonDeals}</div>
            </div>
            <div className="text-sm text-muted-foreground">Won Deals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <div className="text-2xl font-bold">{stats.lostDeals}</div>
            </div>
            <div className="text-sm text-muted-foreground">Lost Deals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            </div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
                <Bar dataKey="won" fill="#10b981" name="Won Deals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
