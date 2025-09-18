import { supabase } from "@/integrations/supabase/client";

export type DealPayload = {
  title: string;
  contact_id: string;
  property_id?: string | null;
  status?: 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value?: number | null;
  currency?: string;
  close_date?: string | null; // ISO date string
  probability?: number;
  notes?: string | null;
  source?: string | null;
};

export async function createDeal(payload: DealPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return { data: null, error: new Error("Not authenticated") } as const;

  // Ensure agent_id is set for RLS compliance
  const dealData = {
    ...payload,
    agent_id: user.id,
  };

  const { data, error } = await supabase
    .from("deals")
    .insert([dealData])
    .select(`
      *,
      leads!inner(name, email, phone),
      properties(title, address)
    `)
    .single();

  return { data, error } as const;
}

export async function listDeals(opts: {
  page?: number;
  pageSize?: number;
  status?: string;
  contact_id?: string;
  property_id?: string;
} = {}) {
  const { page = 1, pageSize = 25, status, contact_id, property_id } = opts;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("deals")
    .select(`
      *,
      leads!inner(name, email, phone),
      properties(title, address)
    `, { count: "exact" })
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (contact_id) {
    query = query.eq("contact_id", contact_id);
  }

  if (property_id) {
    query = query.eq("property_id", property_id);
  }

  const { data, error, count } = await query.range(from, to);
  return { rows: data || [], total: count || 0, error } as const;
}

export async function updateDeal(id: string, patch: Partial<DealPayload>) {
  const { data, error } = await supabase
    .from("deals")
    .update(patch)
    .eq("id", id)
    .select(`
      *,
      leads!inner(name, email, phone),
      properties(title, address)
    `)
    .single();

  return { data, error } as const;
}

export async function deleteDeal(id: string) {
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id);

  return { error } as const;
}

export async function getDeal(id: string) {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      leads!inner(name, email, phone, contact_status),
      properties(title, address, city, price)
    `)
    .eq("id", id)
    .single();

  return { data, error } as const;
}