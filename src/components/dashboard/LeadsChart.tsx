import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface ChartData {
  month: string;
  leads: number;
  converted: number;
  contacted: number;
}

const useLeadsChartData = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeadsData = async () => {
      if (!user) return;

      try {
        // Get data for the last 6 months
        const monthsData: ChartData[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const monthLabel = format(monthDate, 'MMM');

          // Fetch all leads for this month
          const { data: leads, error } = await supabase
            .from('leads')
            .select('status')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          if (error) throw error;

          const totalLeads = leads?.length || 0;
          const contacted = leads?.filter(l => 
            ['contacted', 'qualified', 'negotiation', 'converted', 'closed'].includes(l.status)
          ).length || 0;
          const converted = leads?.filter(l => 
            ['converted', 'closed'].includes(l.status)
          ).length || 0;

          monthsData.push({
            month: monthLabel,
            leads: totalLeads,
            contacted,
            converted
          });
        }

        setData(monthsData);
      } catch (error) {
        console.error('Error fetching leads chart data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadsData();

    // Set up real-time subscription
    const channel = supabase
      .channel('leads-chart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          fetchLeadsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { data, loading };
};

export const LeadsChart: React.FC = () => {
  const { data, loading } = useLeadsChartData();
  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Leads Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Leads Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-xs"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="leads" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Total Leads"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="contacted" 
                stroke="hsl(var(--info))" 
                strokeWidth={2}
                name="Contacted"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="converted" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                name="Converted"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};