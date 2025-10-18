import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User } from 'lucide-react';

interface PropertyMetaTagsProps {
  assignedAgentName?: string | null;
  createdBy?: string | null;
  creatorName?: string | null;
  creatorEmail?: string | null;
  creatorIsAdmin?: boolean;
  createdAt?: string;
  className?: string;
}

export const PropertyMetaTags: React.FC<PropertyMetaTagsProps> = ({
  assignedAgentName,
  createdBy,
  creatorName,
  creatorEmail,
  creatorIsAdmin,
  createdAt,
  className = ''
}) => {
  const assignedText = assignedAgentName || 'Unassigned';
  const listedByText = creatorName || creatorEmail || (creatorIsAdmin ? 'Admin' : '');

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs flex items-center gap-1.5 px-3 py-1">
              <User className="w-3.5 h-3.5" />
              <span className="text-muted-foreground">Assigned</span>
              <span className="font-medium truncate max-w-[150px]">{assignedText}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Assigned to: {assignedText}</p>
          </TooltipContent>
        </Tooltip>

        {listedByText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs flex items-center gap-1.5 px-3 py-1">
                <span className="text-muted-foreground">Listed by</span>
                <span className="font-medium truncate max-w-[150px]">{listedByText}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Listed by: {listedByText}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Created: {createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};
