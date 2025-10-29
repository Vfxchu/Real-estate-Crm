import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Calendar, MoreVertical, X } from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { DueBadge } from "./DueBadge";
import { supabase } from "@/integrations/supabase/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { hideTaskFromSidebar, isTaskHidden } from "@/utils/sidebarTaskHelper";

interface RecentTaskSectionProps {
  tasks: Task[];
  loading: boolean;
  onCompleteTask: (taskId: string) => void;
  leadStatus?: string;
}

interface TaskWithOutcome extends Task {
  outcome?: string;
}

export const RecentTaskSection: React.FC<RecentTaskSectionProps> = ({
  tasks,
  loading,
  onCompleteTask,
  leadStatus
}) => {
  const [tasksWithOutcomes, setTasksWithOutcomes] = useState<TaskWithOutcome[]>([]);
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const maxTasks = 5;

  // Fetch outcomes for tasks
  useEffect(() => {
    const fetchOutcomes = async () => {
      const openTasks = tasks
        .filter(t => t.status === 'Open')
        .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
        .slice(0, maxTasks);

      if (openTasks.length === 0) {
        setTasksWithOutcomes([]);
        return;
      }

      const leadIds = [...new Set(openTasks.map(t => t.lead_id).filter(Boolean))];
      
      if (leadIds.length === 0) {
        setTasksWithOutcomes(openTasks);
        return;
      }

      try {
        const { data: outcomes } = await supabase
          .from('lead_outcomes')
          .select('lead_id, outcome')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });

        const outcomeMap = new Map<string, string>();
        outcomes?.forEach(o => {
          if (!outcomeMap.has(o.lead_id)) {
            outcomeMap.set(o.lead_id, o.outcome);
          }
        });

        const tasksWithOutcomeData = openTasks.map(task => ({
          ...task,
          outcome: task.lead_id ? outcomeMap.get(task.lead_id) : undefined
        }));

        setTasksWithOutcomes(tasksWithOutcomeData);
      } catch (error) {
        console.error('Error fetching outcomes:', error);
        setTasksWithOutcomes(openTasks);
      }
    };

    fetchOutcomes();
  }, [tasks]);

  // Load hidden tasks from local storage
  useEffect(() => {
    const hidden = new Set<string>();
    tasksWithOutcomes.forEach(task => {
      if (isTaskHidden(task.id)) {
        hidden.add(task.id);
      }
    });
    setHiddenTasks(hidden);
  }, [tasksWithOutcomes]);

  const handleHideTask = (taskId: string) => {
    hideTaskFromSidebar(taskId);
    setHiddenTasks(prev => new Set(prev).add(taskId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  const visibleTasks = tasksWithOutcomes.filter(t => !hiddenTasks.has(t.id));

  if (visibleTasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          No upcoming tasks
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleTasks.map((task) => {
        const dueDate = new Date(task.due_at);
        const formattedDueTime = dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Dubai'
        });

        // Format title with outcome (exact task name + outcome if present)
        const displayTitle = task.outcome 
          ? `${task.title} — Outcome: ${task.outcome}`
          : task.title;

        return (
          <Card key={task.id} className="border-primary/20 bg-primary/5">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-sm truncate">{displayTitle}</h4>
                    <DueBadge dueAt={task.due_at} taskStatus={task.status} leadStatus={leadStatus} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{formattedDueTime} (Dubai time)</span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {task.type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onCompleteTask(task.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleHideTask(task.id)}>
                        <X className="w-4 h-4 mr-2" />
                        Remove from sidebar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
