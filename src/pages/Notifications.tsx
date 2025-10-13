import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Users,
  MessageSquare,
  Calendar,
  Target,
  Trash2,
  Mail,
  Settings,
  Activity as ActivityIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by: string;
  lead_id?: string;
  property_id?: string;
  contact_id?: string;
  leads?: { name: string; email: string } | null;
  properties?: { title: string; address: string } | null;
}

export const Notifications = () => {
  const [filter, setFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    notifications, 
    loading, 
    unreadCount,
    markAsRead, 
    markAllAsRead: markAllReadFn, 
    deleteNotification: deleteNotificationFn 
  } = useNotifications();

  // Fetch real-time activities
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
            created_by,
            lead_id,
            property_id,
            contact_id,
            leads(name, email),
            properties(title, address)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        setActivities(data || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();

    // Set up real-time subscription for activities
    const activitiesChannel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities'
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
    };
  }, [user]);

  const filteredNotifications = notifications.filter(notification => {
    const matchesRead = filter === 'all' || 
                       (filter === 'unread' && !notification.is_read) ||
                       (filter === 'read' && notification.is_read);
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
    
    return matchesRead && matchesPriority;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_lead': 
      case 'lead':
        return <Target className="w-5 h-5 text-primary" />;
      case 'appointment': 
      case 'event':
        return <Calendar className="w-5 h-5 text-info" />;
      case 'system': 
        return <Settings className="w-5 h-5 text-warning" />;
      case 'agent_activity': 
        return <Users className="w-5 h-5 text-success" />;
      case 'reminder': 
        return <Bell className="w-5 h-5 text-orange-500" />;
      case 'warning': 
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'info': 
        return <Info className="w-5 h-5 text-info" />;
      case 'call':
        return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'message':
        return <Mail className="w-5 h-5 text-info" />;
      case 'task_created':
      case 'task':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'outcome':
        return <Star className="w-5 h-5 text-warning" />;
      case 'property':
        return <Target className="w-5 h-5 text-success" />;
      default: 
        return <ActivityIcon className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActivityIcon = (type: string) => {
    return getTypeIcon(type);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    toast({
      title: 'Marked as read',
      description: 'Notification has been marked as read',
    });
  };

  const handleMarkAllAsRead = async () => {
    await markAllReadFn();
    toast({
      title: 'All notifications marked as read',
      description: 'All notifications have been marked as read',
    });
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotificationFn(notificationId);
    toast({
      title: 'Notification deleted',
      description: 'Notification has been removed',
    });
  };

  const totalNotifications = notifications.length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.is_read).length;
  
  // Get today's date in ISO format for comparison
  const today = new Date().toISOString().split('T')[0];
  const todayCount = notifications.filter(n => n.created_at.startsWith(today)).length;

  // Get recent activities (last 10)
  const recentActivities = activities.slice(0, 10);

  // Filter activity-related notifications
  const activityNotifications = notifications.filter(n => 
    ['agent_activity', 'new_lead', 'lead', 'call', 'message', 'task_created', 'outcome'].includes(n.type)
  );

  if (loading && loadingActivities) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with important alerts and reminders
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bell className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalNotifications}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">{highPriorityCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <TabsList className="grid w-full lg:w-auto grid-cols-3">
            <TabsTrigger value="all">All Notifications</TabsTrigger>
            <TabsTrigger value="important">Important</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* All Notifications */}
        <TabsContent value="all" className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card key={notification.id} className={`card-elevated transition-all duration-200 hover:shadow-md ${
                !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{notification.title}</h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-3">{notification.message}</p>
                      
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filter !== 'all' || priorityFilter !== 'all'
                    ? 'No notifications match your current filters'
                    : 'You\'re all caught up!'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Important Notifications */}
        <TabsContent value="important" className="space-y-4">
          {filteredNotifications.filter(n => n.priority === 'high').length > 0 ? (
            filteredNotifications.filter(n => n.priority === 'high').map((notification) => (
              <Card key={notification.id} className="card-elevated border-l-4 border-l-destructive">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-destructive mt-1" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">{notification.title}</h4>
                      <p className="text-muted-foreground mb-3">{notification.message}</p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-destructive text-destructive-foreground">
                          High Priority
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No high priority notifications</h3>
                <p className="text-muted-foreground">You don't have any urgent notifications at the moment</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Notifications - Real-time Activities from Database */}
        <TabsContent value="activity" className="space-y-4">
          {loadingActivities ? (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-muted-foreground">Loading activities...</p>
              </CardContent>
            </Card>
          ) : recentActivities.length > 0 ? (
            recentActivities.map((activity) => {
              const lead = activity.leads as any;
              const property = activity.properties as any;
              
              return (
                <Card key={activity.id} className="card-elevated hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm capitalize">
                              {activity.type.replace(/_/g, ' ')}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description}
                        </p>
                        
                        {(lead || property) && (
                          <div className="flex items-center gap-2 mt-2">
                            {lead && (
                              <Badge variant="secondary" className="text-xs">
                                <Target className="w-3 h-3 mr-1" />
                                {lead.name}
                              </Badge>
                            )}
                            {property && (
                              <Badge variant="secondary" className="text-xs">
                                <Target className="w-3 h-3 mr-1" />
                                {property.title || property.address}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recent activities</h3>
                <p className="text-muted-foreground">No activities have been recorded yet</p>
              </CardContent>
            </Card>
          )}
          
          {/* Also show activity-related notifications */}
          {activityNotifications.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-6 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground">Activity Notifications</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              {activityNotifications.map((notification) => (
                <Card key={notification.id} className={`card-elevated transition-all duration-200 hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{notification.title}</h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">{notification.message}</p>
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};