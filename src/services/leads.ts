import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type CreateLeadInput = Partial<Pick<
  TablesInsert<"leads">,
  | "name"
  | "email"
  | "phone"
  | "notes"
  | "priority"
  | "status"
  | "source"
>>;

export async function createLead(input: CreateLeadInput) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    return { data: null, error: new Error("Not authenticated") };
  }

  // Build payload carefully to respect DB defaults and NOT NULL/enum rules
  const payload: TablesInsert<"leads"> = {
    name: input.name || "",
    // Email column is required in types; use empty string if not provided
    email: (input.email ?? "") as string,
    // Optional fields
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    priority: (input.priority as any) ?? "medium",
    status: (input.status as any) ?? "new",
    // RLS: ensure inserts are attributed to current user
    agent_id: user.id,
  } as TablesInsert<"leads">;

  // Only include source if provided (omit to let DB default apply)
  if (input.source && String(input.source).trim().length > 0) {
    // Cast to any to avoid enum widening; backend enforces enum
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

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (source && source !== "all") {
    query = query.eq("source", source);
  }

  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }

  return await query;
}
