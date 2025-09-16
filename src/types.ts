// Core types for the Real Estate CRM
export type LeadCategory = "property" | "requirement";
export type LeadSegment = "residential" | "commercial";
export type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
export type ContactStatus = "lead" | "contacted" | "active_client" | "past_client";
export type PropertyStatus = "available" | "pending" | "sold" | "off_market" | "vacant" | "rented" | "in_development";
export type DealStatus = "prospecting" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
export type UserRole = "admin" | "agent" | "user" | "superadmin";
export type AppRole = "admin" | "agent" | "user" | "superadmin";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: LeadStatus;
  priority: "low" | "medium" | "high";
  source?: "referral" | "website" | "social_media" | "advertisement" | "cold_call" | "email" | "other" | "email_campaign" | "whatsapp_campaign" | "property_finder" | "bayut_dubizzle" | "inbound_call" | "outbound_call" | "campaigns" | "organic_social_media";
  interested_in?: string | null;
  budget_range?: string | null;
  agent_id?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
  score?: number;
  created_at?: string;
  updated_at?: string;
  contact_status: ContactStatus;
  tags?: string[];
  custom_fields?: any;
  merged_into_id?: string | null;
  
  // Extended CRM fields
  lead_source?: string | null;
  interest_tags?: string[];
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
  contact_pref?: string[];
  
  // Joined data
  profiles?: {
    name: string;
    email: string;
  };
}

export interface Property {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  property_type: string;
  status: PropertyStatus;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  address: string;
  city: string;
  state: string;
  zip_code?: string | null;
  agent_id: string;
  images?: string[];
  featured?: boolean;
  created_at?: string;
  updated_at?: string;
  segment?: LeadSegment | null;
  subtype?: string | null;
  location_place_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  unit_number?: string | null;
  offer_type: "rent" | "sale";
  permit_number?: string | null;
  owner_contact_id?: string | null;
}

export interface Deal {
  id: string;
  contact_id: string;
  property_id?: string | null;
  agent_id: string;
  title: string;
  status: DealStatus;
  value?: number | null;
  currency?: string;
  close_date?: string | null;
  probability?: number;
  notes?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id: string;
  lead_id?: string | null;
  property_id?: string | null;
  contact_id?: string | null;
  type: "call" | "email" | "meeting" | "note" | "follow_up" | "whatsapp" | "status_change" | "contact_status_change";
  description: string;
  created_by: string;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  event_type: "property_viewing" | "lead_call" | "contact_meeting" | "follow_up" | "general";
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  start_date: string;
  end_date?: string | null;
  location?: string | null;
  notes?: string | null;
  lead_id?: string | null;
  property_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  agent_id: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  reminder_minutes?: number;
  notification_sent?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  recurrence_end_date?: string | null;
}

export interface Transaction {
  id: string;
  lead_id: string;
  type: string;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  notes?: string | null;
  source_of_funds?: string | null;
  nationality?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  id_expiry?: string | null;
  pep?: boolean;
  created_at?: string;
  updated_at?: string;
  agent_id?: string | null;
  property_id?: string | null;
  deal_id?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success" | "reminder";
  priority: "low" | "medium" | "high" | "urgent";
  is_read?: boolean;
  event_id?: string | null;
  lead_id?: string | null;
  property_id?: string | null;
  deal_id?: string | null;
  scheduled_for?: string | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
