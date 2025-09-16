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
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  // Verify ownership before update
  const { data: existingTransaction } = await (supabase as any)
    .from("transactions")
    .select("agent_id, lead_id")
    .eq("id", id)
    .single();

  if (!existingTransaction) {
    return { data: null, error: { message: 'Transaction not found' } };
  }

  // Check if user owns the transaction or is admin
  const userRole = await (await import('./user-roles')).getCurrentUserRole();
  const isAuthorized = existingTransaction.agent_id === user.id || 
                      ['admin', 'superadmin'].includes(userRole);

  if (!isAuthorized) {
    // Log unauthorized access attempt
    await supabase.rpc('log_security_event', {
      p_action: 'unauthorized_transaction_update',
      p_resource_type: 'transactions',
      p_resource_id: id
    });
    return { data: null, error: { message: 'Insufficient permissions' } };
  }

  const { data, error } = await (supabase as any)
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (!error) {
    // Log successful update
    await supabase.rpc('log_security_event', {
      p_action: 'transaction_updated',
      p_resource_type: 'transactions',
      p_resource_id: id,
      p_new_values: patch
    });
  }

  return { data, error } as const;
}

export async function deleteTransaction(id: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  
  if (!user) {
    return { error: { message: 'User not authenticated' } };
  }

  // Verify ownership before deletion
  const { data: existingTransaction } = await (supabase as any)
    .from("transactions")
    .select("agent_id, lead_id")
    .eq("id", id)
    .single();

  if (!existingTransaction) {
    return { error: { message: 'Transaction not found' } };
  }

  // Check if user owns the transaction or is admin
  const userRole = await (await import('./user-roles')).getCurrentUserRole();
  const isAuthorized = existingTransaction.agent_id === user.id || 
                      ['admin', 'superadmin'].includes(userRole);

  if (!isAuthorized) {
    // Log unauthorized access attempt
    await supabase.rpc('log_security_event', {
      p_action: 'unauthorized_transaction_delete',
      p_resource_type: 'transactions',
      p_resource_id: id
    });
    return { error: { message: 'Insufficient permissions' } };
  }

  // Log deletion attempt
  await supabase.rpc('log_security_event', {
    p_action: 'transaction_deletion_attempt',
    p_resource_type: 'transactions',
    p_resource_id: id,
    p_old_values: existingTransaction
  });

  const { error } = await (supabase as any).from("transactions").delete().eq("id", id);

  if (!error) {
    // Log successful deletion
    await supabase.rpc('log_security_event', {
      p_action: 'transaction_deleted',
      p_resource_type: 'transactions',
      p_resource_id: id
    });
  }

  return { error } as const;
}
