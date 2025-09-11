import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type CreateLeadInput = Partial<TablesInsert<"leads">>;

export async function createLead(input: CreateLeadInput) {
  const { data: userRes } = await supabase.auth.getUser(); 
  const user = userRes?.user;
  if (!user) return { data: null, error: new Error("Not authenticated") } as const;

  try {
    // Step 1: Check if a contact already exists with same email or phone
    let existingContactId = null;
    if (input.email || input.phone) {
      const { data: existingContacts } = await (supabase as any)
        .from("leads")
        .select("id, contact_status, email, phone")
        .or(
          input.email ? `email.eq.${input.email}` : 'id.eq.00000000-0000-0000-0000-000000000000',
          input.phone ? `phone.eq.${input.phone}` : 'id.eq.00000000-0000-0000-0000-000000000000'
        )
        .eq("agent_id", user.id);

      // Find the master contact (one without contact_id or with contact_status != 'lead')
      const masterContact = existingContacts?.find((c: any) => 
        !c.contact_id || c.contact_status !== 'lead'
      );
      
      if (masterContact) {
        existingContactId = masterContact.id;
      }
    }

    // Step 2: Build payload respecting DB NOT NULL/defaults and RLS
    const payload: TablesInsert<"leads"> = {
      name: input.name || "",
      email: (input.email ?? "") as string,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      priority: (input.priority as any) ?? "medium",
      status: (input.status as any) ?? "new",
      // Contact sync fields
      contact_id: existingContactId,
      contact_status: (input as any).contact_status ?? (existingContactId ? 'lead' : 'lead'),
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

    // Step 3: Insert the lead
    const { data, error } = await (supabase as any)
      .from("leads")
      .insert([payload])
      .select("*")
      .single();

    if (error) return { data: null, error };

    // Step 4: If this is a new contact (no existing contact found), update the contact_status if needed
    if (!existingContactId && (input as any).contact_status && (input as any).contact_status !== 'lead') {
      const { error: updateError } = await (supabase as any)
        .from("leads")
        .update({ contact_status: (input as any).contact_status })
        .eq("id", data.id);
      
      if (updateError) {
        console.warn("Failed to update contact status:", updateError);
      }
    }

    return { data, error: null } as const;
  } catch (err: any) {
    return { data: null, error: err } as const;
  }
}

export async function listLeads(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
  status_category?: string; // maps to contact_status
  interest_type?: string;   // maps to interest_tags contains (Buyer/Seller/etc.)
  source?: string;          // enum, omit 'all'
  filters?: Partial<{
    segment: string;
    subtype: string;
    bedrooms: string;
    size_band: string;
    location_address: string; // ilike
    interest_tags: string;
    category: string;
    budget_sale_band: string;
    budget_rent_band: string;
    contact_pref: string;
  }>;
  includeProfile?: boolean;
} = {}) {
  const {
    page = 1,
    pageSize = 25,
    q,
    status_category,
    interest_type,
    source,
    filters = {},
    includeProfile = true,
  } = opts;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let selectCols = "*";
  // Note: Profile joins removed due to missing foreign key constraints

  let query = (supabase as any)
    .from("leads")
    .select(selectCols, { count: "exact" })
    .order("updated_at", { ascending: false });

  // Top-level filters
  if (status_category && status_category !== "all") {
    query = query.eq("contact_status", status_category);
  }

  if (interest_type && interest_type !== "all") {
    // DB stores interest_tags with capitalized values from LeadForm (e.g., "Buyer")
    const tag = interest_type.charAt(0).toUpperCase() + interest_type.slice(1);
    query = query.contains("interest_tags", [tag]);
  }

  if (source && source !== "all") {
    query = query.eq("source", source);
  }

  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }

  // Advanced filters
  if (filters.segment) query = query.eq("segment", filters.segment);
  if (filters.subtype) query = query.eq("subtype", filters.subtype);
  if (filters.bedrooms) query = query.eq("bedrooms", filters.bedrooms);
  if (filters.size_band) query = query.eq("size_band", filters.size_band);
  if (filters.location_address) {
    const like = `%${filters.location_address}%`;
    query = query.ilike("location_address", like);
  }
  if (filters.interest_tags) {
    // Single tag filter - check if interest_tags array contains this tag
    query = query.contains("interest_tags", [filters.interest_tags]);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.budget_sale_band) query = query.eq("budget_sale_band", filters.budget_sale_band);
  if (filters.budget_rent_band) query = query.eq("budget_rent_band", filters.budget_rent_band);
  if (filters.contact_pref) {
    // Single contact preference filter - check if contact_pref array contains this preference
    query = query.contains("contact_pref", [filters.contact_pref]);
  }

  const { data, error, count } = await query.range(from, to);
  return { rows: data || [], total: count || 0, error } as const;
}

export async function updateLead(id: string, patch: Partial<TablesInsert<"leads">>) {
  const payload: Record<string, any> = { ...patch };
  // Never send null/empty source; omit to preserve DB default
  if ("source" in payload && (!payload.source || String(payload.source).trim() === "")) {
    delete payload.source;
  }

  const { data, error } = await (supabase as any)
    .from("leads")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  return { data, error } as const;
}

export async function deleteLead(id: string) {
  const { error } = await (supabase as any).from("leads").delete().eq("id", id);
  return { error } as const;
}
