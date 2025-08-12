import React, { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lead } from "@/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export type LeadFormContext = "agent" | "admin";

// Minimal schema per task: name (required), phone/email optional, source optional (omit if empty), status defaults to "new"
const E164 = /^\+?[1-9]\d{1,14}$/;
const Schema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || E164.test(v), { message: "Enter a valid E.164 number (e.g. +971501234567)" }),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  source: z
    .enum(["website", "referral", "email", "cold_call", "social", "advertising"]) // align with existing app values
    .optional(),
});

export default function LeadForm({
  context = "agent",
  onSuccess,
  defaultValues,
}: {
  context?: LeadFormContext;
  onSuccess?: () => void;
  defaultValues?: Partial<Lead>;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const defaults = useMemo(
    () => ({
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      source: (defaultValues as any)?.source ?? undefined,
    }),
    [defaultValues]
  );

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const handleSubmit = async (values: z.infer<typeof Schema>) => {
    setSubmitting(true);
    try {
      const { createLead } = await import("@/services/leads");

      const payload: Partial<Lead> = {
        name: values.name,
        email: values.email || "",
        phone: values.phone || null,
        status: "new",
        // IMPORTANT: omit source if empty so DB default applies (enum NOT NULL)
        ...(values.source ? { source: values.source } : {}),
      };

      const { error } = await createLead(payload as any);
      if (error) throw error;

      // Notify other lists to refresh (e.g., Contacts)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leads:changed"));
      }

      toast({ title: "Lead created", description: "New lead has been added successfully." });
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Error creating lead", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input inputMode="tel" placeholder="+971501234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="cold_call">Cold call</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Saving..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
