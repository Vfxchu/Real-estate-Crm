import { supabase } from "@/integrations/supabase/client";

/**
 * Contact Master Hub Service
 * Enhanced contact service with status management, property relationships, and timeline
 */

// Re-export from leads service to avoid duplication
export { createLead as createContact } from "@/services/leads";
export { listLeads as listContacts } from "@/services/leads";
export { updateLead as updateContact } from "@/services/leads";
export { deleteLead as deleteContact } from "@/services/leads";

export type ContactPropertyRole = "owner" | "buyer_interest" | "tenant" | "investor";
export type ContactFileTag = "id" | "poa" | "listing_agreement" | "tenancy" | "mou" | "other";
export type ContactStatusMode = "auto" | "manual";
export type ContactStatusValue = "active" | "past";

// A simple, consistent timeline item shape for consumers (components)
export type TimelineItem = {
  id: string;
  type: "status_change" | "lead_change" | "property_change" | "activity" | "file_upload";
  timestamp: string;
  title: string;
  subtitle: string;
  data: any;
};

export async function getContact(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      profiles!leads_agent_id_fkey(name, email)
    `
    )
    .eq("id", id)
    .single();

  return { data, error } as const;
}

export async function mergeContacts(primaryId: string, duplicateIds: string[]) {
  if (!duplicateIds.length) return { data: null, error: null };

  const { data, error } = await supabase
    .from("leads")
    .update({ merged_into_id: primaryId })
    .in("id", duplicateIds);

  return { data, error };
}

// Contact Status Management (Admin only)
export async function setContactStatusMode(contactId: string, mode: ContactStatusMode) {
  const { data, error } = await supabase
    .from("leads")
    .update({ status_mode: mode })
    .eq("id", contactId)
    .select()
    .single();

  if (!error && mode === "auto") {
    // Trigger recomputation when switching to auto
    await recomputeContactStatus(contactId);
  }

  return { data, error };
}

export async function setContactManualStatus(contactId: string, status: ContactStatusValue) {
  // 1) Fetch old effective status for audit
  const { data: existing } = await supabase
    .from("leads")
    .select("status_effective")
    .eq("id", contactId)
    .single();

  const oldStatus = existing?.status_effective ?? null;

  // 2) Update record and lock to manual
  const { data, error } = await supabase
    .from("leads")
    .update({
      status_manual: status,
      status_effective: status,
      status_mode: "manual",
    })
    .eq("id", contactId)
    .select()
    .single();

  if (error || !data) {
    return { data, error };
  }

  // 3) Audit trail
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  await supabase.from("contact_status_changes").insert({
    contact_id: contactId,
    old_status: oldStatus,
    new_status: status,
    reason: "manual override",
    changed_by: userId,
  });

  return { data, error: null };
}

export async function recomputeContactStatus(contactId: string) {
  const { data, error } = await supabase.rpc("recompute_contact_status", {
    p_contact_id: contactId,
    p_reason: "manual_trigger",
  });

  return { data, error };
}

// Property Relationships
export async function linkPropertyToContact(params: {
  contactId: string;
  propertyId: string;
  role: ContactPropertyRole;
}) {
  const { data, error } = await supabase
    .from("contact_properties")
    .insert({
      contact_id: params.contactId,
      property_id: params.propertyId,
      role: params.role,
    })
    .select()
    .single();

  return { data, error };
}

export async function unlinkPropertyFromContact(params: {
  contactId: string;
  propertyId: string;
  role: ContactPropertyRole;
}) {
  const { data, error } = await supabase
    .from("contact_properties")
    .delete()
    .eq("contact_id", params.contactId)
    .eq("property_id", params.propertyId)
    .eq("role", params.role);

  return { data, error };
}

export async function getContactProperties(contactId: string) {
  const { data, error } = await supabase
    .from("contact_properties")
    .select(
      `
      *,
      properties!inner(*)
    `
    )
    .eq("contact_id", contactId);

  return { data, error };
}

/**
 * Unified Timeline
 * - contact_status_changes (contact)
 * - lead_status_changes (lead)
 * - property_status_changes (properties linked via contact_properties)
 * - activities (by lead_id)
 * - contact_files (uploads)
 *
 * NOTE: We cast the Supabase client to `any` for the new audit tables to skip
 * generated-type inference issues until you regenerate types.
 */
export async function getContactTimeline(contactId: string) {
  const sb: any = supabase; // only for the tables missing from generated types

  // Contact status changes
  const { data: statusChanges } = await sb
    .from("contact_status_changes")
    .select("*")
    .eq("contact_id", contactId);

  // Activities (calls/emails/meetings/etc)
  const { data: activities } = await sb.from("activities").select("*").eq("lead_id", contactId);

  // File uploads
  const { data: files } = await sb.from("contact_files").select("*").eq("contact_id", contactId);

  // Lead status changes
  const { data: leadStatusChanges } = await sb
    .from("lead_status_changes")
    .select("*")
    .eq("lead_id", contactId);

  // Property status changes via linked properties
  const { data: props } = await sb
    .from("contact_properties")
    .select("property_id")
    .eq("contact_id", contactId);

  let propertyStatusChanges: any[] = [];
  if (props?.length) {
    const propertyIds = props.map((p: any) => p.property_id);
    const { data } = await sb
      .from("property_status_changes")
      .select("*")
      .in("property_id", propertyIds);
    propertyStatusChanges = data || [];
  }

  const timeline: TimelineItem[] = [
    ...(statusChanges || []).map(
      (item: any): TimelineItem => ({
        id: item.id,
        type: "status_change",
        timestamp: item.created_at,
        title: `Contact status changed to ${item.new_status}`,
        subtitle: item.reason || "",
        data: item,
      })
    ),
    ...(leadStatusChanges || []).map(
      (item: any): TimelineItem => ({
        id: item.id,
        type: "lead_change",
        timestamp: item.created_at,
        title: `Lead status changed to ${item.new_status ?? ""}`,
        subtitle: item.old_status ? `from ${item.old_status}` : "",
        data: item,
      })
    ),
    ...(propertyStatusChanges || []).map(
      (item: any): TimelineItem => ({
        id: item.id,
        type: "property_change",
        timestamp: item.created_at,
        title: `Property status changed to ${item.new_status ?? ""}`,
        subtitle: item.old_status ? `from ${item.old_status}` : "",
        data: item,
      })
    ),
    ...(activities || []).map(
      (item: any): TimelineItem => ({
        id: item.id,
        type: "activity",
        timestamp: item.created_at,
        title: item.description ?? "",
        subtitle: item.type,
        data: item,
      })
    ),
    ...(files || []).map(
      (item: any): TimelineItem => ({
        id: item.id,
        type: "file_upload",
        timestamp: item.created_at,
        title: `Uploaded ${item.name ?? "document"}`,
        subtitle: item.tag || "document",
        data: item,
      })
    ),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { data: timeline, error: null as null };
}

// File management with tags
export async function updateContactFileTag(fileId: string, tag: ContactFileTag) {
  const { data, error } = await supabase
    .from("contact_files")
    .update({ tag })
    .eq("id", fileId)
    .select()
    .single();

  return { data, error };
}
