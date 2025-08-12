import { supabase } from "@/integrations/supabase/client";

export type ActivityPayload = {
  type: string;
  description: string;
};

export async function listActivities(lead_id: string) {
  return await supabase
    .from("activities")
    .select("*")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: false });
}

export async function createActivity(lead_id: string, payload: ActivityPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  const { data, error } = await supabase
    .from("activities")
    .insert([{ lead_id, type: payload.type, description: payload.description, created_by: user?.id }])
    .select("*")
    .single();
  return { data, error } as const;
}

export async function updateActivity(id: string, patch: Partial<ActivityPayload>) {
  const { data, error } = await supabase
    .from("activities")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  return { data, error } as const;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  return { error } as const;
}
