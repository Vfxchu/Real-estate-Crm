import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type CreateLeadInput = Partial<TablesInsert<"leads">>;

export async function createLead(input: CreateLeadInput) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return { data: null, error: new Error("Not authenticated") } as const;

  // Build payload respecting DB NOT NULL/defaults and RLS
  const payload: TablesInsert<"leads"> = {
    name: input.name || "",
    email: (input.email ?? "") as string,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    priority: (input.priority as any) ?? "medium",
    status: (input.status as any) ?? "new",
    // Additive fields (pass through when present)
    lead_source: (input as any).lead_source ?? null,
    interest_tags: (input as any).interest_tags ?? [],
    category: (input as any).category ?? null,
    segment: (input as any).segment ?? null,
    subtype: (input as any).subtype ?? null,
    budget_sale_band: (input as any).budget_sale_band ?? null,
    budget_rent_band: (input as any).budget_rent_band ?? null,
    bedrooms: (input as any).bedrooms ?? null,
    size_band: (input as any).size_band ?? null,
    location_place_id: (input as any).location_place_id ?? null,
    location_lat: (input as any).location_lat ?? null,
    location_lng: (input as any).location_lng ?? null,
    location_address: (input as any).location_address ?? null,
    contact_pref: (input as any).contact_pref ?? [],
    interested_in: input.interested_in ?? null,
    budget_range: input.budget_range ?? null,
    // RLS: attribute to current user
    agent_id: user.id,
  } as TablesInsert<"leads">;

  // Only include enum source if provided and non-empty; omit to use DB default
  if (input.source && String(input.source).trim().length > 0) {
    (payload as any).source = input.source;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert([payload])
    .select("*, profiles!leads_agent_id_fkey(name,email)")
    .single();

  return { data, error } as const;
}

export async function listLeads(params: {
  search?: string;
  status?: string;
  source?: string;
  limit?: number;
} = {}) {
  const { search, status, source, limit = 200 } = params;

  let query = supabase
    .from("leads")
    .select("*, profiles!leads_agent_id_fkey(name,email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") query = query.eq("status", status);
  if (source && source !== "all") query = query.eq("source", source);
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }

  return await query;
}
