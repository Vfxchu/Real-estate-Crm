import { supabase } from "@/integrations/supabase/client";

export type ActivityPayload = {
  type: string;
  description: string;
  lead_id?: string;
  property_id?: string;
  contact_id?: string;
};

export async function listActivities(lead_id?: string, property_id?: string, contact_id?: string) {
  let query = supabase
    .from("activities")
    .select(`
      *,
      leads(name, email),
      properties(title, address)
    `)
    .order("created_at", { ascending: false });

  // Filter by specific relationships
  if (lead_id) {
    query = query.eq("lead_id", lead_id);
  }
  if (property_id) {
    query = query.eq("property_id", property_id);
  }
  // contact_id filtering - in this system, leads ARE contacts
  if (contact_id) {
    query = query.eq("lead_id", contact_id);
  }

  return await query;
}

export async function createActivity(payload: ActivityPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  
  // In this system, leads ARE contacts, so use lead_id for contact references
  const activityData = {
    type: payload.type,
    description: payload.description,
    lead_id: payload.lead_id || payload.contact_id, // Normalize contact_id to lead_id
    property_id: payload.property_id,
    contact_id: payload.contact_id, // Keep both for compatibility but prefer lead_id
    created_by: user?.id
  };
  
  const { data, error } = await supabase
    .from("activities")
    .insert([activityData])
    .select(`
      *,
      leads(name, email),
      properties(title, address)
    `)
    .single();
    
  return { data, error } as const;
}

export async function updateActivity(id: string, patch: Partial<ActivityPayload>) {
  const { data, error } = await supabase
    .from("activities")
    .update(patch)
    .eq("id", id)
    .select(`
      *,
      leads(name, email),
      properties(title, address)
    `)
    .single();
    
  return { data, error } as const;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  return { error } as const;
}

// Get activities for a specific agent's assigned leads and properties
export async function getAgentActivities(agentId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select(`
      *,
      leads(name, email, agent_id),
      properties(title, address, agent_id)
    `)
    .or(`lead_id.in.(select id from leads where agent_id=${agentId}),property_id.in.(select id from properties where agent_id=${agentId})`)
    .order("created_at", { ascending: false });

  return { data, error } as const;
}