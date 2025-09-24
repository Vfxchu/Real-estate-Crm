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

  {/* 
    ─────────────────────────────────────────────────────────────────────────────
    The following block was sitting AFTER the return, which caused the parser to
    throw: `[plugin:vite:react-swc] Expected a semicolon` at the first `value={...}`
    prop line. I have NOT changed your code—just commented it so the file compiles.
    If you want to use this UI, move it ABOVE and wrap everything into ONE return (...).
    ─────────────────────────────────────────────────────────────────────────────
  */}

  {/*
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    options={sizeBands.map(s => ({ value: s, label: s }))}
                    placeholder="Select size"
                    allowClear={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Location: map input for residential; textarea for commercial */}
          {segment === "commercial" ? (
            <FormField
              control={form.control}
              name="location_address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Enter location details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
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
          )}

          {/* Contact Preference */}
          <FormField
            control={form.control}
            name="contact_pref"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Contact Preference</FormLabel>
                <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
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

          <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <Button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
              {submitting ? "Saving..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  */}
}
