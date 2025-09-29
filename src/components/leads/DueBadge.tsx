import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface DueBadgeProps {
  dueAt: string;
  className?: string;
}

export function DueBadge({ dueAt, className }: DueBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const due = new Date(dueAt);
      
      // Convert to Dubai time for display
      const dubaiOffset = 4 * 60 * 60 * 1000; // +4 UTC
      const dueInDubai = new Date(due.getTime() + dubaiOffset);
      const nowInDubai = new Date(now.getTime() + dubaiOffset);
      
      const diff = dueInDubai.getTime() - nowInDubai.getTime();
      
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
  }, [dueAt]);

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