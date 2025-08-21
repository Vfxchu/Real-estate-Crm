import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProperties, Property } from "@/hooks/useProperties";
import { useToast } from "@/hooks/use-toast";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { X } from 'lucide-react';

interface PropertyEditSidebarProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PropertyEditSidebar: React.FC<PropertyEditSidebarProps> = ({
  property,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { updateProperty } = useProperties();
  const { toast } = useToast();

  const handlePropertyFormClose = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">
              Edit Property
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6">
          {property && (
            <PropertyForm
              open={false}
              onOpenChange={handlePropertyFormClose}
              onSuccess={handlePropertyFormClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};