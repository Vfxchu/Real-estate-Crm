import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Lead } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export type LeadFormMode = "create" | "edit";
export type LeadFormContext = "admin" | "agent";

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

const leadSources = [
  "Website",
  "Referral",
  "Email Campaign",
  "Whatsapp Campaign",
  "Property Finder",
  "Bayut/Dubizzle",
  "Inbound Call",
  "Outbound Call",
  "Campaigns",
  "Organic Social Media",
] as const;

const contactPrefs = ["call", "whatsapp", "email"] as const;

const E164 = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/i, "Enter a valid E.164 number (e.g. +971501234567)");

const LeadSchema = z
  .object({
    name: z.string().min(1, "Full Name is required"),
    phone: E164,
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    lead_source: z.string().optional(),
    interest_tags: z
      .array(z.enum(["Buyer", "Seller", "Landlord", "Tenant", "Investor"]))
      .default([]),
    category: z.enum(["property", "requirement"]).optional(),
    segment: z.enum(["residential", "commercial"]).optional(),
    subtype: z.string().optional(),
    budget_sale_band: z.string().optional(),
    budget_rent_band: z.string().optional(),
    bedrooms: z.enum(bedroomOptions).optional(),
    size_band: z.enum(sizeBands).optional(),
    location_place_id: z.string().optional(),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    location_address: z.string().optional(),
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
  // If both selected, prefer requirement flow but show both fields; keep category undefined to avoid forcing UI
  return undefined;
}

function loadGoogleScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    // Already loaded
    // @ts-ignore
    if (window.google && window.google.maps && window.google.maps.places) return resolve();

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

export default function LeadForm({
  mode = "create",
  context,
  defaultValues,
  onSubmit,
  googleApiKey,
}: {
  mode?: LeadFormMode;
  context: LeadFormContext;
  defaultValues?: Partial<Lead>;
  onSubmit?: (payload: Partial<Lead>) => Promise<void> | void;
  googleApiKey?: string; // Prefer passing explictly to avoid env coupling
}) {
  const { user, profile } = useAuth();

  const normalizedDefaults: Partial<Lead> = useMemo(() => {
    const d = defaultValues || {};
    return {
      name: d.name ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      lead_source: d.lead_source ?? d.source ?? undefined,
      interest_tags: d.interest_tags ?? [],
      category: d.category ?? undefined,
      segment: d.segment ?? undefined,
      subtype: d.subtype ?? d.interested_in ?? undefined,
      budget_sale_band: d.budget_sale_band ?? undefined,
      budget_rent_band: d.budget_rent_band ?? undefined,
      bedrooms: d.bedrooms ?? undefined,
      size_band: d.size_band ?? undefined,
      location_place_id: d.location_place_id ?? undefined,
      location_lat: d.location_lat ?? undefined,
      location_lng: d.location_lng ?? undefined,
      location_address: d.location_address ?? undefined,
      contact_pref: d.contact_pref ?? [],
      notes: d.notes ?? undefined,
    };
  }, [defaultValues]);

  const form = useForm<z.infer<typeof LeadSchema>>({
    resolver: zodResolver(LeadSchema),
    defaultValues: normalizedDefaults as any,
    mode: "onBlur",
  });

  const interestTags = form.watch("interest_tags");
  const category = useMemo(() => form.watch("category") || deriveCategory(interestTags || []), [form, interestTags]);
  const segment = form.watch("segment");

  // Google Places Autocomplete
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const [placesReady, setPlacesReady] = useState(false);

  useEffect(() => {
    const key = googleApiKey || (window as any)?.__GOOGLE_MAPS_API_KEY;
    if (!key) return; // No key yet; keep plain input
    loadGoogleScript(key)
      .then(() => {
        setPlacesReady(true);
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
      })
      .catch(() => setPlacesReady(false));
  }, [googleApiKey]);

  const onInternalSubmit = async (values: z.infer<typeof LeadSchema>) => {
    // derive category if not set explicitly
    const derivedCategory = values.category || deriveCategory(values.interest_tags || []);

    const payload: Partial<Lead> = {
      ...values,
      category: derivedCategory,
      // Backward-compat writes
      source: values.lead_source ?? null,
      interested_in: values.subtype || values.segment || (values.interest_tags?.length ? values.interest_tags.join(",") : null),
    };

    if (mode === "create") {
      if (context === "agent" && user) {
        payload.agent_id = user.id;
      }
      if (context === "admin") {
        payload.agent_id = null as any; // keep auto-assign trigger
      }
    }

    await onSubmit?.(payload);
  };

  const showPropertyFlow = useMemo(
    () => (interestTags || []).some((t) => t === "Seller" || t === "Landlord"),
    [interestTags]
  );
  const showRequirementFlow = useMemo(
    () => (interestTags || []).some((t) => t === "Buyer" || t === "Tenant" || t === "Investor"),
    [interestTags]
  );

  const subtypeOptions = segment === "commercial" ? commercialSubtypes : residentialSubtypes;

  return (
    <Card className="p-4 md:p-6 animate-fade-in">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onInternalSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input type="tel" inputMode="tel" placeholder="+971501234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lead Source */}
          <FormField
            control={form.control}
            name="lead_source"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Lead Source</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((s) => (
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

          {/* Interest Tags */}
          <FormField
            control={form.control}
            name="interest_tags"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Interest Type</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="multiple"
                    className="flex flex-wrap gap-2"
                    value={(field.value as string[]) || []}
                    onValueChange={(vals) => field.onChange(vals)}
                  >
                    {["Buyer", "Seller", "Landlord", "Tenant", "Investor"].map((tag) => (
                      <ToggleGroupItem key={tag} value={tag} aria-label={tag}>
                        {tag}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {(showPropertyFlow || showRequirementFlow) && (
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Segment */}
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

              {/* Subtype */}
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

              {/* Budget Sale */}
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
                          {[
                            "under AED1M",
                            "AED1M – AED2M",
                            "AED2M – AED5M",
                            "AED5M – AED10M",
                            "AED10M - AED15M",
                            "Above AED15M",
                          ].map((b) => (
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

              {/* Budget Rent */}
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
                          {[
                            "under AED100K",
                            "AED100K – AED200K",
                            "AED200K – AED300K",
                            "AED300K – AED500K",
                            "AED500K – AED1M",
                            "Above AED1M",
                          ].map((b) => (
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

              {/* Bedrooms (only for residential) */}
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
                          <SelectValue placeholder="Select size band" />
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
            </div>
          )}

          {/* Location */}
          <FormField
            control={form.control}
            name="location_address"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Search location..."
                    {...field}
                    ref={(el) => {
                      field.ref?.(el as any);
                      locationInputRef.current = el;
                    }}
                  />
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
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Contact Preference</FormLabel>
                <div className="flex gap-6">
                  {contactPrefs.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={(field.value || []).includes(opt)}
                        onCheckedChange={(checked) => {
                          const v = new Set([...(field.value || [])]);
                          if (checked) v.add(opt);
                          else v.delete(opt);
                          field.onChange(Array.from(v));
                        }}
                      />
                      <span className="capitalize">{opt}</span>
                    </label>
                  ))}
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
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Additional details..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-2">
            <Button type="submit">{mode === "create" ? "Create Lead" : "Save Changes"}</Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
