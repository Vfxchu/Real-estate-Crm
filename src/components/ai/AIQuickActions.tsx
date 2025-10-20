import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Calendar } from "lucide-react";

interface AIQuickActionsProps {
  onExecuteAction: (actionType: string, data?: any) => void;
}

export const AIQuickActions: React.FC<AIQuickActionsProps> = ({ onExecuteAction }) => {
  const quickActions = [
    {
      label: 'Create Property',
      icon: Plus,
      action: 'create_property',
    },
    {
      label: 'Search',
      icon: Search,
      action: 'search',
    },
    {
      label: 'Summary',
      icon: FileText,
      action: 'generate_summary',
    },
    {
      label: 'Schedule',
      icon: Calendar,
      action: 'create_event',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {quickActions.map((action) => (
        <Button
          key={action.action}
          variant="outline"
          size="sm"
          onClick={() => onExecuteAction(action.action)}
          className="flex flex-col gap-1 h-auto py-2"
        >
          <action.icon className="h-4 w-4" />
          <span className="text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};
