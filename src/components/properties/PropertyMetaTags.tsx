import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User } from 'lucide-react';

interface PropertyMetaTagsProps {
  assignedAgentName?: string | null;
  createdBy?: string | null;
  creatorName?: string | null;
  creatorIsAdmin?: boolean;
  createdAt?: string;
  className?: string;
}

export const PropertyMetaTags: React.FC<PropertyMetaTagsProps> = ({
  assignedAgentName,
  createdBy,
  creatorName,
  creatorIsAdmin,
  createdAt,
  className = ''
}) => {
  const assignedText = assignedAgentName || 'Unassigned';
  const listedByText = creatorIsAdmin ? 'Admin' : (creatorName || 'System');

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[120px]">Assigned to: {assignedText}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Assigned to: {assignedText}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <span className="truncate max-w-[120px]">Listed by: {listedByText}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Created on: {createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
