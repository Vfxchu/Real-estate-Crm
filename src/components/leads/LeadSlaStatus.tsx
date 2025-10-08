import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertTriangle } from 'lucide-react';
import { calculateSlaStatus } from '@/services/crm';
import { format } from 'date-fns';

interface LeadSlaStatusProps {
  lead: any;
  agentName?: string;
}

export function LeadSlaStatus({ lead, agentName }: LeadSlaStatusProps) {
  const [slaStatus, setSlaStatus] = useState(calculateSlaStatus(lead));

  useEffect(() => {
    setSlaStatus(calculateSlaStatus(lead));
    
    // Update every minute if SLA is active
    if (!lead.first_outcome_at && lead.assigned_at) {
      const interval = setInterval(() => {
        setSlaStatus(calculateSlaStatus(lead));
      }, 60000); // 1 minute

      return () => clearInterval(interval);
    }
  }, [lead]);

  // Show unreachable status if lead has 3+ failed attempts and is lost
  if (lead.unreachable_count >= 3 && lead.status === 'lost') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Unreachable (No Response)
        </Badge>
        <Badge variant="outline">
          {lead.unreachable_count} attempts failed
        </Badge>
      </div>
    );
  }

  // Lead is locked to agent after first outcome
  if (lead.first_outcome_at) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          <User className="w-3 h-3 mr-1" />
          Owned by {agentName}
        </Badge>
        {lead.last_outcome && (
          <Badge variant="outline">
            Last: {lead.last_outcome.replace('_', ' ')}
          </Badge>
        )}
        {lead.unreachable_count > 0 && (
          <Badge variant="outline" className="text-orange-600">
            {lead.unreachable_count} failed attempts
          </Badge>
        )}
      </div>
    );
  }

  // No SLA active
  if (!slaStatus) {
    return null;
  }

  const { isOverdue, remainingMinutes, elapsedMinutes } = slaStatus;

  // Don't show SLA overdue for won leads
  if (isOverdue && lead.status === 'won') {
    return null;
  }

  if (isOverdue) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="animate-pulse">
          <AlertTriangle className="w-3 h-3 mr-1" />
          SLA Overdue ({elapsedMinutes}m)
        </Badge>
        <Badge variant="outline">
          Assigned to {agentName}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={cn(
          "bg-orange-100 text-orange-800 border-orange-200",
          remainingMinutes <= 5 && "bg-red-100 text-red-800 border-red-200"
        )}
      >
        <Clock className="w-3 h-3 mr-1" />
        SLA: {remainingMinutes}m remaining
      </Badge>
      <Badge variant="outline">
        Assigned to {agentName}
      </Badge>
      {lead.assigned_at && (
        <span className="text-xs text-muted-foreground">
          Since {format(new Date(lead.assigned_at), 'HH:mm')}
        </span>
      )}
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}