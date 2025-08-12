import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lead } from "@/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export type LeadFormContext = "agent" | "admin";

const sizeBands = [
  "under 1,000",
  "1,000–2,000",
  "2,000–3,000",
  "3,000–5,000",
  "Above 5,000",
] as const;

const bedroomOptions = [
  "Studio",
  "1BR",
  "2BR",
  "3BR",
  "4BR",
  "5BR",
  "6+ BR",
] as const;

const residentialSubtypes = ["Apartment", "Townhouse", "Villa", "Plot", "Building"] as const;
const commercialSubtypes = ["Office", "Shop", "Villa", "Plot", "Building"] as const;

const contactPrefs = ["call", "whatsapp", "email"] as const;

// Keep source optional and omit when empty to let DB default apply
const sourceOptions = ["website", "referral", "email", "cold_call", "social", "advertising"] as const;

const E164 = /^\+?[1-9]\d{1,14}$/;

const Schema = z
  .object({
    // Basic
    name: z.string().trim().min(1, "Full name is required"),
    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || E164.test(v), { message: "Enter a valid E.164 number (e.g. +971501234567)" }),
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    source: z.enum(sourceOptions).optional(),

    // Interest + category/segment
    interest_tags: z.array(z.enum(["Buyer", "Seller", "Landlord", "Tenant", "Investor"])) .default([]),
    category: z.enum(["property", "requirement"]).optional(),
    segment: z.enum(["residential", "commercial"]).optional(),
    subtype: z.string().optional(),

    // Budgets and details
    budget_sale_band: z.string().optional(),
    budget_rent_band: z.string().optional(),
    bedrooms: z.enum(bedroomOptions).optional(),
    size_band: z.enum(sizeBands).optional(),

    // Location
    location_place_id: z.string().optional(),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    location_address: z.string().optional(),

    // Preferences & notes
    contact_pref: z.array(z.enum(contactPrefs)).default([]),
    notes: z.string().optional(),
  })
  .refine((d) => !(d.budget_sale_band && d.budget_rent_band), {
    message: "Choose either Sale budget or Rent budget (not both).",
    path: ["budget_sale_band"],
  });

function deriveCategory(tags: string[]): "property" | "requirement" | undefined {
  const hasProperty = tags.some((t) => t === "Seller" || t === "Landlord");
  const hasRequirement = tags.some((t) => t === "Buyer" || t === "Tenant" || t === "Investor");
  if (hasProperty && !hasRequirement) return "property";
  if (hasRequirement && !hasProperty) return "requirement";
  return undefined;
}

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

  // Google Places
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const [placesReady, setPlacesReady] = useState(false);

  useEffect(() => {
    const key = (window as any)?.__GOOGLE_MAPS_API_KEY;
    if (!key) return;
    if ((window as any).google?.maps?.places) {
      setPlacesReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.onload = () => setPlacesReady(true);
    script.onerror = () => setPlacesReady(false);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    // Wire autocomplete
    if (!placesReady) return;
    // @ts-ignore
    if (locationInputRef.current && window.google?.maps?.places?.Autocomplete) {
      // @ts-ignore
      const ac = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        fields: ["place_id", "formatted_address", "geometry"],
      });
      ac.addListener("place_changed", () => {
        // @ts-ignore
        const place = ac.getPlace();
        if (!place) return;
        const loc = place.geometry?.location;
        form.setValue("location_place_id", place.place_id || undefined);
        form.setValue("location_address", place.formatted_address || undefined);
        if (loc) {
          form.setValue("location_lat", typeof loc.lat === "function" ? loc.lat() : (loc.lat as any));
          form.setValue("location_lng", typeof loc.lng === "function" ? loc.lng() : (loc.lng as any));
        }
      });
    }
  }, [placesReady]);

  const defaults = useMemo(
    () => ({
      // basic
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      source: (defaultValues as any)?.source ?? undefined,
      // derived
      interest_tags: defaultValues?.interest_tags ?? [],
      category: defaultValues?.category ?? undefined,
      segment: defaultValues?.segment ?? undefined,
      subtype: defaultValues?.subtype ?? undefined,
      // budgets/details
      budget_sale_band: defaultValues?.budget_sale_band ?? undefined,
      budget_rent_band: defaultValues?.budget_rent_band ?? undefined,
      bedrooms: defaultValues?.bedrooms ?? undefined,
      size_band: defaultValues?.size_band ?? undefined,
      // location
      location_place_id: defaultValues?.location_place_id ?? undefined,
      location_lat: defaultValues?.location_lat ?? undefined,
      location_lng: defaultValues?.location_lng ?? undefined,
      location_address: defaultValues?.location_address ?? undefined,
      // prefs/notes
      contact_pref: defaultValues?.contact_pref ?? [],
      notes: defaultValues?.notes ?? "",
    }),
    [defaultValues]
  );

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: defaults as any,
    mode: "onBlur",
  });

  const tags = form.watch("interest_tags") || [];
  const derivedCategory = useMemo(() => form.watch("category") || deriveCategory(tags), [form, tags]);
  const segment = form.watch("segment");
  const subtypeOptions = segment === "commercial" ? commercialSubtypes : residentialSubtypes;

  const handleSubmit = async (values: z.infer<typeof Schema>) => {
    setSubmitting(true);
    try {
      const { createLead } = await import("@/services/leads");

      const payload: Partial<Lead> = {
        name: values.name,
        email: values.email || "",
        phone: values.phone || null,
        status: "new",
        // optional enum source; omit to let DB default apply
        ...(values.source ? { source: values.source } : {}),
        // new additive fields
        interest_tags: values.interest_tags,
        category: derivedCategory,
        segment: values.segment,
        subtype: values.subtype,
        budget_sale_band: values.budget_sale_band,
        budget_rent_band: values.budget_rent_band,
        bedrooms: values.bedrooms,
        size_band: values.size_band,
        location_place_id: values.location_place_id,
        location_lat: values.location_lat,
        location_lng: values.location_lng,
        location_address: values.location_address,
        contact_pref: values.contact_pref,
        notes: values.notes,
        // Backward-compat
        interested_in:
          values.subtype || values.segment || (values.interest_tags?.length ? values.interest_tags.join(",") : null),
      };

      const { error } = await createLead(payload as any);
      if (error) throw error;

      // Let lists know to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leads:changed"));
      }

      useToast().toast({ title: "Lead created", description: "New lead has been added successfully." });
      onSuccess?.();
    } catch (e: any) {
      useToast().toast({ title: "Error creating lead", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Interest Type (Tags) at the beginning */}
          <FormField
            control={form.control}
            name="interest_tags"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Interest Type</FormLabel>
                <FormControl>
                  <ToggleGroup type="multiple" value={(field.value as string[]) || []} onValueChange={field.onChange} className="flex flex-wrap gap-2">
                    {["Buyer", "Seller", "Landlord", "Tenant", "Investor"].map((t) => (
                      <ToggleGroupItem key={t} value={t} aria-label={t}>
                        {t}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Auto-derived category (not editable) */}
          <div className="md:col-span-2">
            <div className="text-sm text-muted-foreground">Category inferred: {derivedCategory || "—"}</div>
          </div>

          {/* Property Type (segment) shown when tags selected */}
          {(derivedCategory || tags.length > 0) && (
            <FormField
              control={form.control}
              name="segment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Residential or Commercial" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Subtype */}
          {(derivedCategory || segment) && (
            <FormField
              control={form.control}
              name="subtype"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtype</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!segment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subtype" />
                      </SelectTrigger>
                      <SelectContent>
                        {(subtypeOptions as readonly string[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Budget (Sale) */}
          <FormField
            control={form.control}
            name="budget_sale_band"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (Sale)</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sale budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {["under AED1M", "AED1M – AED2M", "AED2M – AED5M", "AED5M – AED10M", "AED10M - AED15M", "Above AED15M"].map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Budget (Rent) */}
          <FormField
            control={form.control}
            name="budget_rent_band"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (Rent)</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rent budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {["under AED100K", "AED100K – AED200K", "AED200K – AED300K", "AED300K – AED500K", "AED500K – AED1M", "Above AED1M"].map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Bedrooms (residential only) */}
          {segment === "residential" && (
            <FormField
              control={form.control}
              name="bedrooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrooms</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bedrooms" />
                      </SelectTrigger>
                      <SelectContent>
                        {bedroomOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Size band */}
          <FormField
            control={form.control}
            name="size_band"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size (sqft)</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeBands.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Location (Google autocomplete input) */}
          <FormField
            control={form.control}
            name="location_address"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Search address or place" {...field} ref={locationInputRef} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Preference */}
          <FormField
            control={form.control}
            name="contact_pref"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Contact Preference</FormLabel>
                <div className="flex flex-wrap gap-4 mt-2">
                  {contactPrefs.map((opt) => {
                    const checked = (field.value as string[])?.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!checked}
                          onCheckedChange={(v) => {
                            const arr = new Set<string>((field.value as string[]) || []);
                            if (v) arr.add(opt);
                            else arr.delete(opt);
                            field.onChange(Array.from(arr));
                          }}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Additional information..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Basic info (name, phone, email) at end for completeness */}
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

          {/* Source (optional) */}
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
                      {sourceOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
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
