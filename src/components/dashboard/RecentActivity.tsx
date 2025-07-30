import React from 'react';
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

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'lead',
    title: 'New Lead Added',
    description: 'John Smith - Interested in 3BR house',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    user: { name: 'Sarah Agent', initials: 'SA' },
    status: 'success',
  },
  {
    id: '2',
    type: 'call',
    title: 'Follow-up Call',
    description: 'Called Maria Garcia - Left voicemail',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    user: { name: 'Mike Agent', initials: 'MA' },
    status: 'pending',
  },
  {
    id: '3',
    type: 'appointment',
    title: 'Property Viewing',
    description: 'Scheduled viewing for 123 Oak Street',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    user: { name: 'Lisa Agent', initials: 'LA' },
    status: 'success',
  },
  {
    id: '4',
    type: 'email',
    title: 'Email Sent',
    description: 'Property brochure sent to David Wilson',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    user: { name: 'Sarah Agent', initials: 'SA' },
    status: 'success',
  },
  {
    id: '5',
    type: 'message',
    title: 'WhatsApp Message',
    description: 'Responded to inquiry about pricing',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    user: { name: 'Tom Agent', initials: 'TA' },
    status: 'success',
  },
];

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
  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => (
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};