import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Edit2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
  description?: string;
  status?: string;
}

interface TaskEventItemProps {
  event: CalendarEvent;
  onUpdate: () => void;
}

export function TaskEventItem({ event, onUpdate }: TaskEventItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [startDate, setStartDate] = useState(new Date(event.start_date));
  const [startTime, setStartTime] = useState(format(new Date(event.start_date), 'HH:mm'));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStatusToggle = async () => {
    const newStatus = event.status === 'completed' ? 'scheduled' : 'completed';
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'status_change',
          description: `Task "${event.title}" marked as ${newStatus}`,
          lead_id: event.id, // This should be lead_id from the event
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        }]);

      toast({
        title: 'Status updated',
        description: `Task marked as ${newStatus}`,
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const updatedDate = new Date(startDate);
      updatedDate.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_date: updatedDate.toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      // Log activity for changes
      await supabase
        .from('activities')
        .insert([{
          type: 'note',
          description: `Task "${title}" updated`,
          lead_id: event.id, // This should be lead_id from the event
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        }]);

      toast({
        title: 'Task updated',
        description: 'Changes saved successfully',
      });

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(event.title);
    setDescription(event.description || '');
    setStartDate(new Date(event.start_date));
    setStartTime(format(new Date(event.start_date), 'HH:mm'));
    setIsEditing(false);
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <Checkbox
        checked={event.status === 'completed'}
        onCheckedChange={handleStatusToggle}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0 space-y-2">
        {isEditing ? (
          <>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm font-medium"
              placeholder="Task title"
            />
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10 w-32"
                />
              </div>
            </div>
            
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows={2}
              className="text-sm"
            />
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading || !title.trim()}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-sm font-medium",
                event.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {event.title}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.start_date), "PPP 'at' p")}
            </p>
            
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {event.event_type}
              </Badge>
              {event.status && (
                <Badge 
                  variant={event.status === 'completed' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {event.status}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}