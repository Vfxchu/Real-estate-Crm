import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Activity, TrendingUp, Phone, Mail, Calendar, Upload } from "lucide-react";
import { getContactTimeline } from "@/services/contacts";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

interface TimelineItem {
  id: string;
  type: 'status_change' | 'activity' | 'file_upload' | 'lead_change' | 'property_change';
  timestamp: string;
  title: string;
  subtitle: string;
  data: any;
}

interface ContactTimelineProps {
  contactId: string;
}

export function ContactTimeline({ contactId }: ContactTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [contactId]);

  const loadTimeline = async () => {
    try {
      const { data } = await getContactTimeline(contactId);
      setTimeline(data || []);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    }
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <TrendingUp className="h-4 w-4" />;
      case 'activity':
        return <Activity className="h-4 w-4" />;
      case 'file_upload':
        return <Upload className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'bg-blue-500';
      case 'activity':
        return 'bg-green-500';
      case 'file_upload':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, yyyy HH:mm');
    }
  };

  const groupByDate = (items: TimelineItem[]) => {
    const groups: { [key: string]: TimelineItem[] } = {};
    
    items.forEach(item => {
      const date = format(new Date(item.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const groupedTimeline = groupByDate(timeline);

  return (
    <div className="space-y-6">
      {groupedTimeline.map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-sm font-medium text-muted-foreground">
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getTypeColor(item.type)} text-white`}>
                      {getIcon(item.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <time className="text-xs text-muted-foreground">
                          {format(new Date(item.timestamp), 'HH:mm')}
                        </time>
                      </div>
                      
                      {item.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.subtitle}
                        </p>
                      )}
                      
                      {item.type === 'file_upload' && item.data.tag && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {item.data.tag.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      
      {timeline.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No timeline events yet</p>
        </div>
      )}
    </div>
  );
}