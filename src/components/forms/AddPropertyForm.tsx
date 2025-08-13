import React from 'react';
import { PropertyForm } from './PropertyForm';

interface AddPropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddPropertyForm: React.FC<AddPropertyFormProps> = ({ open, onOpenChange, onSuccess }) => {
  return (
    <PropertyForm 
      open={open} 
      onOpenChange={onOpenChange} 
      onSuccess={onSuccess}
    />
  );
};