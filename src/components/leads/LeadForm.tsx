import React from "react";
import { Lead } from "@/types";
import UnifiedContactForm from "@/components/forms/UnifiedContactForm";

export type LeadFormContext = "agent" | "admin";

export default function LeadForm({
  context = "agent",
  onSuccess,
  defaultValues,
}: {
  context?: LeadFormContext;
  onSuccess?: () => void;
  defaultValues?: Partial<Lead>;
}) {
  return (
    <UnifiedContactForm
      contact={defaultValues as Lead}
      onSuccess={onSuccess}
      mode="lead"
      title="New Lead"
    />
  );
}
