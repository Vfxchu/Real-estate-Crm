import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
}) => {
  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'bg-success text-success-foreground';
      case 'decrease':
        return 'bg-destructive text-destructive-foreground';
      case 'neutral':
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={cn("card-elevated hover:shadow-lg transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg sm:text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {change && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-1.5 py-0.5", getChangeColor(change.type))}
            >
              {change.value}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};