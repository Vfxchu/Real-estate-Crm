import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  UserPlus, 
  Calendar, 
  Target,
  Phone,
  Mail
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'message' | 'lead' | 'appointment' | 'call' | 'email';
  title: string;
  description: string;
  timestamp: Date;
  user: {
    name: string;
    initials: string;
  };
  status?: 'success' | 'pending' | 'failed';
}

// Hook to fetch real activities from Supabase
const useRecentActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            id,
            type,
            description,
            created_at,
            lead_id,
            property_id,
            created_by,
            leads!activities_lead_id_fkey(name, email),
            properties!activities_property_id_fkey(title, address)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const formattedActivities: Activity[] = (data || []).map(activity => {
          const lead = activity.leads as any;
          const property = activity.properties as any;
          
          let title = activity.type;
          let description = activity.description;
          
          // Format title and description based on type and related data
          if (activity.type === 'lead' && lead) {
            title = 'New Lead Added';
            description = `${lead.name} - ${lead.email}`;
          } else if (activity.type === 'appointment' && property) {
            title = 'Property Viewing';
            description = `Scheduled viewing for ${property.address}`;
          } else if (activity.type === 'call' && lead) {
            title = 'Follow-up Call';
            description = `Called ${lead.name}`;
          }

          return {
            id: activity.id,
            type: activity.type as Activity['type'],
            title,
            description,
            timestamp: new Date(activity.created_at),
            user: {
              name: 'System User',
              initials: 'SU'
            },
            status: 'success' as const
          };
        });

        setActivities(formattedActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  return { activities, loading };
};

const getActivityIcon = (type: Activity['type']) => {
  const iconClass = "w-4 h-4";
  
  switch (type) {
    case 'message':
      return <MessageSquare className={iconClass} />;
    case 'lead':
      return <UserPlus className={iconClass} />;
    case 'appointment':
      return <Calendar className={iconClass} />;
    case 'call':
      return <Phone className={iconClass} />;
    case 'email':
      return <Mail className={iconClass} />;
    default:
      return <Target className={iconClass} />;
  }
};

const getStatusColor = (status?: Activity['status']) => {
  switch (status) {
    case 'success':
      return 'bg-success text-success-foreground';
    case 'pending':
      return 'bg-warning text-warning-foreground';
    case 'failed':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const RecentActivity: React.FC = () => {
  const { activities, loading } = useRecentActivities();

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading activities...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No recent activities found
            </div>
          ) : (
            activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <div className="flex items-center space-x-2">
                    {activity.status && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-0.5 ${getStatusColor(activity.status)}`}
                      >
                        {activity.status}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                
                <div className="flex items-center space-x-2">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs">{activity.user.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{activity.user.name}</span>
                </div>
              </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};