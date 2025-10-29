import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Calendar, MoreVertical, EyeOff } from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { DueBadge } from "./DueBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  formatTaskTitleWithOutcome, 
  getHiddenTaskIds, 
  hideTaskFromSidebar,
  TaskWithOutcome 
} from "@/utils/sidebarTasksHelper";

interface RecentTaskSectionProps {
  tasks: Task[];
  loading: boolean;
  onCompleteTask: (taskId: string) => void;
  leadStatus?: string;
  maxTasks?: number;
}

export const RecentTaskSection: React.FC<RecentTaskSectionProps> = ({
  tasks,
  loading,
  onCompleteTask,
  leadStatus,
  maxTasks = 5
}) => {
  const [tasksWithOutcomes, setTasksWithOutcomes] = useState<TaskWithOutcome[]>([]);
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(new Set());
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);

  // Load hidden tasks from localStorage on mount
  useEffect(() => {
    setHiddenTaskIds(getHiddenTaskIds());
  }, []);

  // Fetch outcomes for tasks
  useEffect(() => {
    const fetchOutcomes = async () => {
      if (!tasks.length) {
        setTasksWithOutcomes([]);
        return;
      }

      setLoadingOutcomes(true);
      try {
        const leadIds = [...new Set(tasks.map(t => t.lead_id).filter(Boolean))];
        
        if (leadIds.length === 0) {
          setTasksWithOutcomes(tasks.map(t => ({ ...t, outcome: undefined })));
          return;
        }

        // Fetch latest outcome for each lead
        const { data: outcomes } = await supabase
          .from('lead_outcomes')
          .select('lead_id, outcome, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });

        // Map outcomes to tasks (latest outcome per lead)
        const outcomeMap = new Map<string, string>();
        outcomes?.forEach(o => {
          if (!outcomeMap.has(o.lead_id)) {
            outcomeMap.set(o.lead_id, o.outcome);
          }
        });

        const enriched = tasks.map(task => ({
          ...task,
          outcome: task.lead_id ? outcomeMap.get(task.lead_id) : undefined
        }));

        setTasksWithOutcomes(enriched);
      } catch (error) {
        console.warn('Failed to fetch task outcomes:', error);
        setTasksWithOutcomes(tasks.map(t => ({ ...t, outcome: undefined })));
      } finally {
        setLoadingOutcomes(false);
      }
    };

    fetchOutcomes();
  }, [tasks]);

  const handleHideTask = (taskId: string) => {
    hideTaskFromSidebar(taskId);
    setHiddenTaskIds(prev => new Set([...prev, taskId]));
  };

  if (loading || loadingOutcomes) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  // Filter: Open tasks, not hidden, sorted by due date
  const visibleTasks = tasksWithOutcomes
    .filter(t => t.status === 'Open' && !hiddenTaskIds.has(t.id))
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, maxTasks);

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
    <div className="space-y-2">
      {visibleTasks.map((task) => {
        const dueDate = new Date(task.due_at);
        const formattedDueTime = dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Dubai'
        });

        const displayTitle = formatTaskTitleWithOutcome(task.title, task.outcome);

        return (
          <Card key={task.id} className="border-primary/20 bg-primary/5">
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{displayTitle}</h4>
                    <DueBadge dueAt={task.due_at} taskStatus={task.status} leadStatus={leadStatus} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{formattedDueTime}</span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {task.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onCompleteTask(task.id)}
                    className="h-8"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleHideTask(task.id)}>
                        <EyeOff className="w-3 h-3 mr-2" />
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
