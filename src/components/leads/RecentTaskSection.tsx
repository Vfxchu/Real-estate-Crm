import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Calendar } from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { DueBadge } from "./DueBadge";
import { supabase } from "@/integrations/supabase/client";

interface RecentTaskSectionProps {
  tasks: Task[];
  loading: boolean;
  onCompleteTask: (taskId: string) => void;
  leadStatus?: string;
}

interface TaskWithOutcome extends Task {
  outcomeLabel?: string;
}

interface CalendarEventSimple {
  id: string;
  title: string;
  start_date: string;
  status: string;
}

interface TaskData {
  taskWithOutcome: TaskWithOutcome | null;
  meetingEvent: CalendarEventSimple | null;
}

// Utility function for consistent date formatting
const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Dubai'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

export const RecentTaskSection: React.FC<RecentTaskSectionProps> = React.memo(({
  tasks,
  loading,
  onCompleteTask,
  leadStatus
}) => {
  const [taskData, setTaskData] = useState<TaskData>({
    taskWithOutcome: null,
    meetingEvent: null
  });
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Memoize the most recent open task (next upcoming by due date)
  const recentTask = useMemo(() => {
    return tasks
      .filter(t => t.status === 'Open')
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0];
  }, [tasks]);

  // Fetch outcomes and meeting events for the recent task (batched state update)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!recentTask?.lead_id) {
        if (isMounted) {
          setTaskData({
            taskWithOutcome: recentTask || null,
            meetingEvent: null
          });
        }
        return;
      }

      setIsLoadingData(true);

      try {
        // Batch fetch both outcomes and events in parallel
        const [outcomesResult, eventsResult] = await Promise.all([
          supabase
            .from('lead_outcomes')
            .select('outcome, created_at')
            .eq('lead_id', recentTask.lead_id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('calendar_events')
            .select('id, title, start_date, status')
            .eq('lead_id', recentTask.lead_id)
            .eq('event_type', 'contact_meeting')
            .eq('status', 'scheduled')
            .order('start_date', { ascending: true })
            .limit(1)
        ]);

        if (!isMounted) return;

        const taskWithOutcome: TaskWithOutcome = {
          ...recentTask,
          outcomeLabel: outcomesResult.data?.[0]?.outcome
        };

        // Single state update to prevent flickering
        setTaskData({
          taskWithOutcome,
          meetingEvent: eventsResult.data?.[0] || null
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setTaskData({
            taskWithOutcome: recentTask,
            meetingEvent: null
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [recentTask?.id, recentTask?.lead_id]);

  // Memoize the complete handler
  const handleCompleteTask = useCallback((taskId: string) => {
    onCompleteTask(taskId);
  }, [onCompleteTask]);

  // Loading skeleton to prevent layout shift
  if (loading || isLoadingData) {
    return (
      <Card className="border-primary/20 bg-primary/5" role="status" aria-label="Loading task information">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 flex-shrink-0" />
          </div>
        </div>
      </Card>
    );
  }

  // If there's a meeting scheduled, show it instead of task
  if (taskData.meetingEvent && taskData.taskWithOutcome?.outcomeLabel === 'Meeting Scheduled') {
    const formattedDateTime = formatDateTime(taskData.meetingEvent.start_date);

    return (
      <Card 
        className="border-primary/20 bg-primary/5 transition-colors duration-200"
        role="article"
        aria-label="Scheduled meeting task"
      >
        <div className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h4 className="font-semibold text-sm text-foreground">Meeting Scheduled</h4>
                <Badge 
                  variant="outline" 
                  className="text-xs bg-primary/10 border-primary/30"
                  aria-label="Current task outcome"
                >
                  Current Outcome
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <time className="font-medium" dateTime={taskData.meetingEvent.start_date}>
                  {formattedDateTime} (Dubai time)
                </time>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                {taskData.meetingEvent.title}
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleCompleteTask(taskData.taskWithOutcome!.id)}
              className="flex-shrink-0 w-full sm:w-auto transition-transform hover:scale-105 active:scale-95"
              aria-label="Complete meeting task"
            >
              <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
              Complete
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Otherwise show the regular task
  if (!recentTask || !taskData.taskWithOutcome) {
    return (
      <div 
        className="flex items-center justify-center py-6 sm:py-8" 
        role="status"
        aria-label="No upcoming tasks"
      >
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>No upcoming tasks</span>
        </div>
      </div>
    );
  }

  const taskToDisplay = taskData.taskWithOutcome;
  const formattedDueTime = formatDateTime(taskToDisplay.due_at);

  // Format title with outcome if available
  const displayTitle = useMemo(() => {
    return taskToDisplay.outcomeLabel 
      ? `${taskToDisplay.title} — Outcome: ${taskToDisplay.outcomeLabel}`
      : taskToDisplay.title;
  }, [taskToDisplay.title, taskToDisplay.outcomeLabel]);

  return (
    <Card 
      className="border-primary/20 bg-primary/5 transition-colors duration-200"
      role="article"
      aria-label="Current task details"
    >
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 
                className="font-semibold text-sm text-foreground truncate max-w-full"
                title={displayTitle}
              >
                {displayTitle}
              </h4>
              <DueBadge 
                dueAt={taskToDisplay.due_at} 
                taskStatus={taskToDisplay.status} 
                leadStatus={leadStatus} 
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <time dateTime={taskToDisplay.due_at}>
                {formattedDueTime} (Dubai time)
              </time>
            </div>
            {taskToDisplay.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2 break-words">
                {taskToDisplay.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs"
                aria-label={`Task type: ${taskToDisplay.type.replace('_', ' ')}`}
              >
                {taskToDisplay.type.replace('_', ' ')}
              </Badge>
              <Badge 
                variant="secondary" 
                className="text-xs"
                aria-label={`Task status: ${taskToDisplay.status}`}
              >
                {taskToDisplay.status}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleCompleteTask(taskToDisplay.id)}
            className="flex-shrink-0 w-full sm:w-auto transition-transform hover:scale-105 active:scale-95"
            aria-label={`Complete task: ${taskToDisplay.title}`}
          >
            <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
            Complete
          </Button>
        </div>
      </div>
    </Card>
  );
});

RecentTaskSection.displayName = 'RecentTaskSection';
