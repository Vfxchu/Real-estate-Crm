import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export const RecentTaskSection: React.FC<RecentTaskSectionProps> = ({
  tasks,
  loading,
  onCompleteTask,
  leadStatus
}) => {
  const [tasksWithOutcomes, setTasksWithOutcomes] = useState<TaskWithOutcome[]>([]);
  const [meetingScheduledEvents, setMeetingScheduledEvents] = useState<CalendarEventSimple[]>([]);
  const [hasMeetingScheduledOutcome, setHasMeetingScheduledOutcome] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Get the most recent open task (next upcoming by due date)
  const recentTask = tasks
    .filter(t => t.status === 'Open')
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0];

  // Store lead_id from tasks
  useEffect(() => {
    if (recentTask?.lead_id) {
      setLeadId(recentTask.lead_id);
    }
  }, [recentTask?.lead_id]);

  // Fetch outcomes and meeting events
  useEffect(() => {
    const fetchData = async () => {
      if (!leadId && !recentTask?.lead_id) {
        setTasksWithOutcomes(recentTask ? [recentTask] : []);
        setMeetingScheduledEvents([]);
        setHasMeetingScheduledOutcome(false);
        return;
      }

      const currentLeadId = leadId || recentTask?.lead_id;

      try {
        // Fetch latest outcome for the lead
        const { data: outcomes, error: outcomeError } = await supabase
          .from('lead_outcomes')
          .select('outcome, created_at')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (outcomeError) throw outcomeError;

        const latestOutcome = outcomes?.[0]?.outcome;
        setHasMeetingScheduledOutcome(latestOutcome === 'Meeting Scheduled');

        // If we have a recent task, attach the outcome to it
        if (recentTask) {
          const taskWithOutcome: TaskWithOutcome = {
            ...recentTask,
            outcomeLabel: latestOutcome
          };
          setTasksWithOutcomes([taskWithOutcome]);
        } else {
          setTasksWithOutcomes([]);
        }

        // Fetch meeting scheduled events
        const { data: events, error: eventsError } = await supabase
          .from('calendar_events')
          .select('id, title, start_date, status')
          .eq('lead_id', currentLeadId)
          .eq('event_type', 'contact_meeting')
          .eq('status', 'scheduled')
          .order('start_date', { ascending: true });

        if (eventsError) throw eventsError;

        setMeetingScheduledEvents(events || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setTasksWithOutcomes(recentTask ? [recentTask] : []);
        setMeetingScheduledEvents([]);
        setHasMeetingScheduledOutcome(false);
      }
    };

    fetchData();
  }, [recentTask?.id, leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  // Check if we have a meeting scheduled outcome and event
  const meetingEvent = meetingScheduledEvents[0];

  // If there's a "Meeting Scheduled" outcome and a meeting event, show it instead of task
  if (hasMeetingScheduledOutcome && meetingEvent) {
    const meetingDate = new Date(meetingEvent.start_date);
    const formattedDateTime = meetingDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Dubai'
    });

    return (
      <Card className="border-primary/20 bg-primary/5">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-sm truncate">Meeting Scheduled</h4>
                <Badge variant="outline" className="text-xs">
                  Upcoming
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Clock className="w-3 h-3" />
                <span>{formattedDateTime} (Dubai time)</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {meetingEvent.title}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Otherwise show the regular task
  if (!recentTask) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          No upcoming tasks
        </div>
      </div>
    );
  }

  const taskToDisplay: TaskWithOutcome = tasksWithOutcomes[0] || recentTask;
  const dueDate = new Date(taskToDisplay.due_at);
  const formattedDueTime = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dubai'
  });

  // Format title with outcome if available
  const displayTitle = taskToDisplay.outcomeLabel 
    ? `${taskToDisplay.title} — Outcome: ${taskToDisplay.outcomeLabel}`
    : taskToDisplay.title;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-sm truncate">{displayTitle}</h4>
              <DueBadge dueAt={taskToDisplay.due_at} taskStatus={taskToDisplay.status} leadStatus={leadStatus} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3" />
              <span>{formattedDueTime} (Dubai time)</span>
            </div>
            {taskToDisplay.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {taskToDisplay.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {taskToDisplay.type.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {taskToDisplay.status}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => onCompleteTask(taskToDisplay.id)}
            className="flex-shrink-0"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Complete
          </Button>
        </div>
      </div>
    </Card>
  );
};
