import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface DueBadgeProps {
  dueAt: string;
  className?: string;
  taskStatus?: string;
  leadStatus?: string;
}

export function DueBadge({ dueAt, className, taskStatus, leadStatus }: DueBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimeRemaining = () => {
      const { nowInDubai, toDubaiTime } = require('@/lib/dubai-time');
      const now = nowInDubai();
      const dueInDubai = toDubaiTime(dueAt);
      
      const diff = dueInDubai.getTime() - now.getTime();
      
      // Hide badge completely if task is completed or lead is won
      if (taskStatus === 'Completed' || taskStatus === 'completed' || leadStatus === 'won') {
        setTimeRemaining("");
        return;
      }
      
      if (diff <= 0) {
        setTimeRemaining("Overdue");
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeRemaining(`Due in ${days}d`);
      } else if (hours > 0) {
        setTimeRemaining(`Due in ${hours}h`);
      } else {
        setTimeRemaining(`Due in ${minutes}m`);
      }
    };

    // Update immediately
    updateTimeRemaining();

    // Update every minute
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [dueAt, taskStatus, leadStatus]);

  // Don't render badge if no time remaining (completed/won)
  if (!timeRemaining) {
    return null;
  }

  const isOverdue = timeRemaining === "Overdue";

  return (
    <Badge 
      variant={isOverdue ? "destructive" : "secondary"} 
      className={`flex items-center gap-1 ${className}`}
    >
      <Clock className="h-3 w-3" />
      {timeRemaining}
    </Badge>
  );
}