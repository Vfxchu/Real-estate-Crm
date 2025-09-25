import React from "react";
import { Lead } from "@/types";
import UnifiedContactForm from "@/components/forms/UnifiedContactForm";
import { Card } from "@/components/ui/card";

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
    <Card className="p-4 md:p-6 border-0 shadow-none">
      <UnifiedContactForm
        contact={defaultValues as Lead}
        onSuccess={onSuccess}
        mode="lead"
        title="Lead Details"
        className="space-y-6"
      />
    </Card>
  );
}
