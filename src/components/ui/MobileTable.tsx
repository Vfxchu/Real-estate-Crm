import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface MobileTableColumn {
  key: string;
  header: string;
  render?: (value: any, item: any) => React.ReactNode;
  className?: string;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

export interface MobileTableAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

interface MobileTableProps {
  data: any[];
  columns: MobileTableColumn[];
  actions?: MobileTableAction[];
  loading?: boolean;
  emptyMessage?: string;
  keyField?: string;
  mobileCardClassName?: string;
}

export const MobileTable: React.FC<MobileTableProps> = ({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = 'No data found',
  keyField = 'id',
  mobileCardClassName = '',
}) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <Card key={item[keyField]} className={`cursor-pointer hover:shadow-md transition-shadow ${mobileCardClassName}`}>
            <CardContent className="p-4">
              <div className="space-y-2">
                {columns
                  .filter(col => !col.hideOnMobile)
                  .map((column) => {
                    const value = item[column.key];
                    const displayValue = column.render ? column.render(value, item) : value;
                    
                    return (
                      <div key={column.key} className="flex justify-between items-center">
                        <span className="font-medium text-sm text-muted-foreground">
                          {column.mobileLabel || column.header}:
                        </span>
                        <span className="text-sm">{displayValue}</span>
                      </div>
                    );
                  })}
                
                {actions.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-2 border-t">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant || 'outline'}
                        onClick={() => action.onClick(item)}
                        className={`h-8 ${action.className || ''}`}
                      >
                        <action.icon className="h-3 w-3 mr-1" />
                        <span className="text-xs">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {actions.length > 0 && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item[keyField]} className="hover:bg-muted/30">
              {columns.map((column) => {
                const value = item[column.key];
                const displayValue = column.render ? column.render(value, item) : value;
                
                return (
                  <TableCell key={column.key} className={column.className}>
                    {displayValue}
                  </TableCell>
                );
              })}
              {actions.length > 0 && (
                <TableCell>
                  <div className="flex gap-2">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant || 'outline'}
                        onClick={() => action.onClick(item)}
                        className={action.className || ''}
                      >
                        <action.icon className="h-4 w-4" />
                        <span className="sr-only">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MobileTable;