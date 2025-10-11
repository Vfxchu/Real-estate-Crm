import React from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Property } from "@/hooks/useProperties";
import { PropertyEditForm } from "@/components/forms/PropertyEditForm";
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
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <SheetTitle className="text-xl font-semibold">
            Edit Property
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {property && (
            <PropertyEditForm
              property={property}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};