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
      leads!activities_lead_id_fkey(name, email),
      properties!activities_property_id_fkey(title, address)
    `)
    .order("created_at", { ascending: false });

  // Filter by specific relationships
  if (lead_id) {
    query = query.eq("lead_id", lead_id);
  }
  if (property_id) {
    query = query.eq("property_id", property_id);
  }
  if (contact_id) {
    query = query.eq("contact_id", contact_id);
  }

  return await query;
}

export async function createActivity(payload: ActivityPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  
  const { data, error } = await supabase
    .from("activities")
    .insert([{ 
      type: payload.type, 
      description: payload.description, 
      lead_id: payload.lead_id,
      property_id: payload.property_id,
      contact_id: payload.contact_id,
      created_by: user?.id 
    }])
    .select(`
      *,
      leads!activities_lead_id_fkey(name, email),
      properties!activities_property_id_fkey(title, address)
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
      leads!activities_lead_id_fkey(name, email),
      properties!activities_property_id_fkey(title, address)
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
      leads!activities_lead_id_fkey(name, email, agent_id),
      properties!activities_property_id_fkey(title, address, agent_id)
    `)
    .or(`leads.agent_id.eq.${agentId},properties.agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false });

  return { data, error } as const;
}