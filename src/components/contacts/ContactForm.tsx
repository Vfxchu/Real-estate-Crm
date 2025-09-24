import React from 'react';
import { Lead } from '@/types';
import UnifiedContactForm from '@/components/forms/UnifiedContactForm';

interface ContactFormProps {
  contact?: Lead;
  onSuccess?: (contactData?: any) => void;
  onCancel?: () => void;
  className?: string;
}

export default function ContactForm({ contact, onSuccess, onCancel, className }: ContactFormProps) {
  return (
    <UnifiedContactForm
      contact={contact}
      onSuccess={onSuccess}
      onCancel={onCancel}
      className={className}
      mode="contact"
    />
  );
}