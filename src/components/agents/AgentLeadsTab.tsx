import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, Mail, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  priority: string;
  created_at: string;
  last_contact_at?: string;
}

interface AgentLeadsTabProps {
  agentId: string;
}

export const AgentLeadsTab: React.FC<AgentLeadsTabProps> = ({ agentId }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchLeads();

    // Real-time subscription
    const channel = supabase
      .channel('agent-leads-tab')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);

      // Calculate status breakdown
      const breakdown: Record<string, number> = {};
      data?.forEach(lead => {
        breakdown[lead.status] = (breakdown[lead.status] || 0) + 1;
      });
      setStatusBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-500',
      contacted: 'bg-yellow-500',
      qualified: 'bg-purple-500',
      negotiating: 'bg-orange-500',
      won: 'bg-green-500',
      lost: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Breakdown */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {Object.entries(statusBreakdown).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">{status}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leads assigned yet</p>
          ) : (
            <div className="space-y-4">
              {leads.map(lead => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{lead.name}</h4>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</div>
                    {lead.last_contact_at && (
                      <div>Last contact {formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
