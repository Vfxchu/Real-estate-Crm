import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Plus } from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface TaskCreationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  taskType: 'follow_up' | 'meeting' | 'under_offer' | 'closure';
  businessOutcome?: string;
  onComplete: () => void;
}

export function TaskCreationDialog({
  isOpen,
  onOpenChange,
  leadId,
  leadName,
  taskType,
  businessOutcome,
  onComplete
}: TaskCreationDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const taskConfig = {
    follow_up: {
      title: 'Follow-up Call',
      description: 'Follow up with lead to continue conversation',
      icon: '📞'
    },
    meeting: {
      title: 'Schedule Meeting',
      description: 'Schedule meeting with interested lead',
      icon: '🤝'
    },
    under_offer: {
      title: 'Under Offer Follow-up',
      description: 'Follow up on property offer status',
      icon: '📋'
    },
    closure: {
      title: 'Closure Documentation',
      description: 'Document deal closure and next steps',
      icon: '📝'
    }
  };

  const quickTimeOptions = [
    { label: 'In 30 minutes', hours: 0.5 },
    { label: 'In 1 hour', hours: 1 },
    { label: 'In 2 hours', hours: 2 },
    { label: 'Tomorrow 9 AM', hours: 24, time: '09:00' },
    { label: 'Tomorrow 2 PM', hours: 24, time: '14:00' },
    { label: 'Next week', hours: 168, time: '09:00' }
  ];

  const handleQuickSelect = (option: typeof quickTimeOptions[0]) => {
    const date = addHours(new Date(), option.hours);
    setSelectedDate(date);
    
    if (option.time) {
      setSelectedTime(option.time);
    } else {
      setSelectedTime(format(date, 'HH:mm'));
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast({
        title: 'Date required',
        description: 'Please select a date and time for the task.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Combine date and time
      const [hours, minutes] = selectedTime ? selectedTime.split(':').map(Number) : [9, 0];
      const taskDateTime = new Date(selectedDate);
      taskDateTime.setHours(hours, minutes, 0, 0);

      const config = taskConfig[taskType];
      
      // Create calendar event/task
      await supabase.from('calendar_events').insert({
        title: config.title,
        event_type: taskType === 'meeting' ? 'meeting' : 'task',
        start_date: taskDateTime.toISOString(),
        end_date: addHours(taskDateTime, 1).toISOString(),
        lead_id: leadId,
        agent_id: user.id,
        created_by: user.id,
        description: `${config.description} - ${businessOutcome ? `Following ${businessOutcome}` : 'Scheduled task'}`,
        status: 'scheduled'
      });

      // Log activity
      await supabase.from('activities').insert({
        type: 'task_created',
        description: `${config.title} scheduled for ${format(taskDateTime, 'PPp')}`,
        lead_id: leadId,
        created_by: user.id
      });

      toast({
        title: 'Task created',
        description: `${config.title} scheduled for ${format(taskDateTime, 'PPp')}`,
      });

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
    } catch (error: any) {
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const config = taskConfig[taskType];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create Task
          </DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Lead: {leadName}</p>
            <p className="flex items-center gap-2">
              <span>{config.icon}</span>
              {config.title}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Time Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quick Schedule</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickTimeOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(option)}
                  className="h-auto py-3 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Custom Date & Time</Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selected DateTime Display */}
          {selectedDate && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{config.icon}</div>
                  <div>
                    <p className="font-medium">{config.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 
                        ...(selectedTime ? selectedTime.split(':').map(Number) : [9, 0])), 
                        'PPPP p'
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedDate || loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}