import React, { useState } from 'react';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'new_lead' | 'appointment' | 'system' | 'agent_activity' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  timestamp: string;
  relatedId?: string;
  actionUrl?: string;
}

// Mock notifications - in production, store in Supabase
const mockNotifications: Notification[] = [];

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { toast } = useToast();

  const filteredNotifications = notifications.filter(notification => {
    const matchesRead = filter === 'all' || 
                       (filter === 'unread' && !notification.isRead) ||
                       (filter === 'read' && notification.isRead);
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
    
    return matchesRead && matchesPriority;
  });

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_lead': return <Target className="w-5 h-5 text-primary" />;
      case 'appointment': return <Calendar className="w-5 h-5 text-info" />;
      case 'system': return <Settings className="w-5 h-5 text-warning" />;
      case 'agent_activity': return <Users className="w-5 h-5 text-success" />;
      case 'reminder': return <Bell className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    ));
    toast({
      title: 'Marked as read',
      description: 'Notification has been marked as read',
    });
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
    toast({
      title: 'All notifications marked as read',
      description: 'All notifications have been marked as read',
    });
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(notifications.filter(notif => notif.id !== notificationId));
    toast({
      title: 'Notification deleted',
      description: 'Notification has been removed',
    });
  };

  const totalNotifications = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.isRead).length;
  const todayCount = notifications.filter(n => n.timestamp.startsWith('2024-01-20')).length;

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
          <Button variant="outline" onClick={markAllAsRead}>
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
                !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''
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
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {notification.timestamp}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-3">{notification.message}</p>
                      
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        {notification.actionUrl && (
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
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
          {filteredNotifications.filter(n => n.priority === 'high').map((notification) => (
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
                        {notification.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Activity Notifications */}
        <TabsContent value="activity" className="space-y-4">
          {filteredNotifications.filter(n => n.type === 'agent_activity' || n.type === 'new_lead').map((notification) => (
            <Card key={notification.id} className="card-elevated">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {notification.type === 'new_lead' ? 'L' : 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{notification.title}</h4>
                    <p className="text-muted-foreground text-sm mb-2">{notification.message}</p>
                    <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};