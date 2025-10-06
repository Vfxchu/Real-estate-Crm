import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Edit, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface NextTaskCardProps {
  task: {
    id: string;
    title: string;
    start_date: string;
    event_type: string;
    status?: string;
  } | null;
  onComplete: () => void;
  onReschedule: () => void;
  onEdit: () => void;
  onClick?: () => void;
}

export function NextTaskCard({ task, onComplete, onReschedule, onEdit, onClick }: NextTaskCardProps) {
  if (!task) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">No upcoming tasks</p>
        </CardContent>
      </Card>
    );
  }

  const isOverdue = new Date(task.start_date) < new Date();
  const isCompleted = task.status === 'completed';

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors" 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) => {
              if (!checked) return; // Only allow checking, not unchecking
              onComplete();
            }}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium truncate">{task.title}</h4>
              <Badge variant="outline" className="text-xs">
                {task.event_type}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                {format(new Date(task.start_date), "MMM d, yyyy 'at' h:mm a")}
              </span>
              {isOverdue && !isCompleted && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0"
              title="Edit task"
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReschedule}
              className="h-8 w-8 p-0"
              title="Reschedule"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
