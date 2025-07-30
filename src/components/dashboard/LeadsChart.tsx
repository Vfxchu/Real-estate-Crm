import React from 'react';
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

const data = [
  { month: 'Jan', leads: 45, converted: 12, contacted: 38 },
  { month: 'Feb', leads: 52, converted: 15, contacted: 45 },
  { month: 'Mar', leads: 48, converted: 18, contacted: 42 },
  { month: 'Apr', leads: 61, converted: 22, contacted: 55 },
  { month: 'May', leads: 55, converted: 20, contacted: 48 },
  { month: 'Jun', leads: 67, converted: 25, contacted: 58 },
  { month: 'Jul', leads: 72, converted: 28, contacted: 65 },
];

export const LeadsChart: React.FC = () => {
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