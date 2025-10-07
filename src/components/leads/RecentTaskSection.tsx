import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Calendar } from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { DueBadge } from "./DueBadge";

interface RecentTaskSectionProps {
  tasks: Task[];
  loading: boolean;
  onCompleteTask: (taskId: string) => void;
}

export const RecentTaskSection: React.FC<RecentTaskSectionProps> = ({
  tasks,
  loading,
  onCompleteTask
}) => {
  // Get the most recent open task
  const recentTask = tasks.find(t => t.status === 'Open');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

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

  const dueDate = new Date(recentTask.due_at);
  const formattedDueTime = dueDate.toLocaleDateString('en-US', {
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
              <h4 className="font-semibold text-sm truncate">{recentTask.title}</h4>
              <DueBadge dueAt={recentTask.due_at} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3" />
              <span>{formattedDueTime} (Dubai time)</span>
            </div>
            {recentTask.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {recentTask.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {recentTask.type.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {recentTask.status}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => onCompleteTask(recentTask.id)}
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
