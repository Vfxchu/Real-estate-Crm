import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from 'lucide-react';

interface PropertyDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  propertyTitle: string;
  isDeleting: boolean;
}

export const PropertyDeleteDialog: React.FC<PropertyDeleteDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  propertyTitle,
  isDeleting,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Delete Property
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>"{propertyTitle}"</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              This action will permanently remove:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Property listing and all details</li>
              <li>Associated images and documents</li>
              <li>Any related deals or transactions</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Property
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};