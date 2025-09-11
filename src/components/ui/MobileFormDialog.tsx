import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MobileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileFormDialog: React.FC<MobileFormDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-[95vw] sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto",
        "p-4 sm:p-6",
        className
      )}>
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};