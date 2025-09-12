import { supabase } from "@/integrations/supabase/client";

export type TransactionPayload = {
  type: string;
  amount?: number;
  currency?: string;
  status?: string;
  notes?: string;
  // KYC fields
  source_of_funds?: string;
  nationality?: string;
  id_type?: string;
  id_number?: string;
  id_expiry?: string; // ISO date
  pep?: boolean;
  // New CRM linking fields
  agent_id?: string;
  property_id?: string;
  deal_id?: string;
};

export async function listTransactions(lead_id: string) {
  return await (supabase as any)
    .from("transactions")
    .select("*")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: false });
}

export async function createTransaction(lead_id: string, payload: TransactionPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }
  
  // Mandatory agent assignment for security compliance
  const transactionData = {
    ...payload,
    lead_id,
    agent_id: user.id, // Always set to current user for security
  };

  const { data, error } = await (supabase as any)
    .from("transactions")
    .insert([transactionData])
    .select("*")
    .single();
  return { data, error } as const;
}

export async function updateTransaction(id: string, patch: Partial<TransactionPayload>) {
  const { data, error } = await (supabase as any)
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  return { data, error } as const;
}

export async function deleteTransaction(id: string) {
  const { error } = await (supabase as any).from("transactions").delete().eq("id", id);
  return { error } as const;
}
