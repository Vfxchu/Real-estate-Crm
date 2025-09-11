export type LeadCategory = "property" | "requirement";
export type LeadSegment = "residential" | "commercial";

export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
  priority?: "low" | "medium" | "high";
  source?: string | null; // legacy
  interested_in?: string | null; // legacy
  budget_range?: string | null; // legacy
  agent_id?: string | null;
  follow_up_date?: string;
  notes?: string | null;
  score?: number;
  created_at?: string;
  updated_at?: string;
  // profiles join (optional)
  profiles?: {
    name: string;
    email: string;
  };

  // New additive fields
  lead_source?: string | null;
  interest_tags?: string[] | null;
  category?: LeadCategory | null;
  segment?: LeadSegment | null;
  subtype?: string | null;
  budget_sale_band?: string | null;
  budget_rent_band?: string | null;
  bedrooms?: string | null;
  size_band?: string | null;
  location_place_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  contact_pref?: string[] | null;
  contact_status?: string | null;
  
  // Database fields that were missing
  custom_fields?: any | null;
  merged_into_id?: string | null;
  tags?: string[] | null;
}
