import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface NotificationPopupProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'reminder';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
  } | null;
  onClose: () => void;
  onMarkAsRead: () => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onClose,
  onMarkAsRead
}) => {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'reminder':
        return <Bell className="w-5 h-5 text-primary" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      default:
        return <Info className="w-5 h-5 text-info" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleClose = () => {
    onMarkAsRead();
    onClose();
  };

  return (
    <Dialog open={!!notification} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor()}>
              {notification.priority}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {notification.type}
            </Badge>
          </div>
          
          <p className="text-muted-foreground">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date(notification.created_at).toLocaleString()}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleClose} className="flex-1">
              Got it
            </Button>
            <Button variant="outline" onClick={onClose}>
              Remind later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};