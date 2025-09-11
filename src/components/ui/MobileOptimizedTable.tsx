import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface TableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

interface MobileOptimizedTableProps {
  data: any[];
  columns: TableColumn[];
  title?: string;
  emptyMessage?: string;
  actions?: (row: any) => React.ReactNode;
  className?: string;
}

export const MobileOptimizedTable: React.FC<MobileOptimizedTableProps> = ({
  data,
  columns,
  title,
  emptyMessage = "No data available",
  actions,
  className
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {title && (
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
        )}
        {data.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {emptyMessage}
            </CardContent>
          </Card>
        ) : (
          data.map((row, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                {columns
                  .filter(col => !col.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground min-w-0 flex-1">
                        {column.mobileLabel || column.label}:
                      </span>
                      <div className="ml-2 flex-1 text-right">
                        {column.render 
                          ? column.render(row[column.key], row)
                          : <span className="text-sm">{row[column.key] || '-'}</span>
                        }
                      </div>
                    </div>
                  ))}
                {actions && (
                  <div className="pt-3 border-t">
                    {actions(row)}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    );
  }

  // Desktop view - traditional table
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className="text-left p-4 font-medium text-muted-foreground"
                  >
                    {column.label}
                  </th>
                ))}
                {actions && <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/30">
                    {columns.map((column) => (
                      <td key={column.key} className="p-4">
                        {column.render 
                          ? column.render(row[column.key], row)
                          : row[column.key] || '-'
                        }
                      </td>
                    ))}
                    {actions && (
                      <td className="p-4">
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};