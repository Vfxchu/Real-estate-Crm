import { supabase } from "@/integrations/supabase/client";

export type PropertyPayload = {
  title: string;
  segment?: 'residential' | 'commercial';
  subtype?: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  unit_number?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  status: 'available' | 'pending' | 'sold' | 'off_market' | 'vacant' | 'rented' | 'in_development';
  offer_type: 'rent' | 'sale';
  price: number;
  description?: string;
  permit_number?: string;
  owner_contact_id?: string;
  images?: string[];
  featured?: boolean;
  location_place_id?: string;
  location_lat?: number;
  location_lng?: number;
};

export async function createProperty(payload: PropertyPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return { data: null, error: new Error("Not authenticated") } as const;

  // Ensure agent_id is set and match DB schema exactly
  const propertyData = {
    title: payload.title,
    segment: payload.segment,
    subtype: payload.subtype,
    property_type: payload.property_type,
    address: payload.address,
    city: payload.city,
    state: payload.state || 'UAE', // Required field with default
    zip_code: payload.zip_code,
    unit_number: payload.unit_number,
    bedrooms: payload.bedrooms,
    bathrooms: payload.bathrooms,
    area_sqft: payload.area_sqft,
    status: payload.status,
    offer_type: payload.offer_type,
    price: payload.price,
    description: payload.description,
    permit_number: payload.permit_number,
    owner_contact_id: payload.owner_contact_id,
    images: payload.images,
    featured: payload.featured,
    location_place_id: payload.location_place_id,
    location_lat: payload.location_lat,
    location_lng: payload.location_lng,
    agent_id: user.id, // Set by system
  };

  const { data, error } = await supabase
    .from("properties")
    .insert([propertyData])
    .select(`
      *,
      leads!properties_owner_contact_id_fkey(name, email, phone)
    `)
    .single();

  return { data, error } as const;
}

export async function listProperties(opts: {
  page?: number;
  pageSize?: number;
  status?: string;
  segment?: string;
  city?: string;
  offer_type?: string;
} = {}) {
  const { page = 1, pageSize = 25, status, segment, city, offer_type } = opts;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("properties")
    .select(`
      *,
      leads!properties_owner_contact_id_fkey(name, email, phone),
      profiles!properties_agent_id_fkey(name, email)
    `, { count: "exact" })
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (segment && segment !== "all") {
    query = query.eq("segment", segment);
  }

  if (city && city !== "all") {
    query = query.eq("city", city);
  }

  if (offer_type && offer_type !== "all") {
    query = query.eq("offer_type", offer_type);
  }

  const { data, error, count } = await query.range(from, to);
  return { rows: data || [], total: count || 0, error } as const;
}

export async function updateProperty(id: string, patch: Partial<PropertyPayload>) {
  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", id)
    .select(`
      *,
      leads!properties_owner_contact_id_fkey(name, email, phone),
      profiles!properties_agent_id_fkey(name, email)
    `)
    .single();

  return { data, error } as const;
}

export async function deleteProperty(id: string) {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  return { error } as const;
}

export async function getProperty(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select(`
      *,
      leads!properties_owner_contact_id_fkey(name, email, phone),
      profiles!properties_agent_id_fkey(name, email)
    `)
    .eq("id", id)
    .single();

  return { data, error } as const;
}