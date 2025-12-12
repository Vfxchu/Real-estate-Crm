import { z } from 'zod';

// Property form schema - matches PropertyForm.tsx
export const propertySchema = z.object({
  title: z.string().min(1, "Property title is required"),
  segment: z.enum(['residential', 'commercial'], { required_error: "Property segment is required" }),
  subtype: z.string().min(1, "Property subtype is required"),
  offer_type: z.enum(['rent', 'sale'], { required_error: "Offer type is required" }),
  price: z.number().min(0, "Price must be greater than 0"),
  description: z.string().optional(),
  location: z.string().min(1, "General location is required"),
  address: z.string().min(1, "Address is required"),
  city: z.enum(['Dubai', 'Abu Dhabi', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain', 'Ajman', 'Fujairah'], { required_error: "City is required" }),
  unit_number: z.string().optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  area_sqft: z.number().min(0).optional(),
  plot_area_sqft: z.number().min(0).optional(),
  status: z.enum(['vacant', 'rented', 'in_development'], { required_error: "Status is required" }),
  permit_number: z.string().optional(),
  owner_contact_id: z.string().min(1, "Owner contact is required"),
  agent_id: z.string().optional(),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

// Filter options derived from schema - remove as const to make them mutable
export const PROPERTY_SEGMENTS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
];

export const OFFER_TYPES = [
  { value: 'sale', label: 'Sale' },
  { value: 'rent', label: 'Rent' },
];

// Active property statuses
export const PROPERTY_STATUS_ACTIVE = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'rented', label: 'Rented' },
  { value: 'in_development', label: 'In Development' },
];

// Inactive/Off-market property statuses
export const PROPERTY_STATUS_INACTIVE = [
  { value: 'not_available_sold', label: 'Not Available (Sold)' },
  { value: 'not_available_rented', label: 'Not Available (Rented)' },
  { value: 'off_market', label: 'Off Market' },
];

// Combined for backward compatibility
export const PROPERTY_STATUS = [
  ...PROPERTY_STATUS_ACTIVE,
  ...PROPERTY_STATUS_INACTIVE,
];

// Location list - full provided list from requirements
export const LOCATIONS = [
  { value: 'Al Barari', label: 'Al Barari' },
  { value: 'Al Furjan', label: 'Al Furjan' },
  { value: 'Al Jaddaf', label: 'Al Jaddaf' },
  { value: 'Al Jurf', label: 'Al Jurf' },
  { value: 'Al Mamsha', label: 'Al Mamsha' },
  { value: 'Al Marjan Island', label: 'Al Marjan Island' },
  { value: 'Al Qasimia City', label: 'Al Qasimia City' },
  { value: 'Al Reem Island', label: 'Al Reem Island' },
  { value: 'Al Sufouh', label: 'Al Sufouh' },
  { value: 'Al Zorah City', label: 'Al Zorah City' },
  { value: 'Aljada', label: 'Aljada' },
  { value: 'Arabian Hills Estate', label: 'Arabian Hills Estate' },
  { value: 'Arabian Ranches 3', label: 'Arabian Ranches 3' },
  { value: 'Arjan', label: 'Arjan' },
  { value: 'Bluewaters Island', label: 'Bluewaters Island' },
  { value: 'Business Bay', label: 'Business Bay' },
  { value: 'City Walk', label: 'City Walk' },
  { value: 'Damac Hills', label: 'Damac Hills' },
  { value: 'Damac Hills 2', label: 'Damac Hills 2' },
  { value: 'Damac Lagoons', label: 'Damac Lagoons' },
  { value: 'Damac Riverside', label: 'Damac Riverside' },
  { value: 'DIFC', label: 'DIFC' },
  { value: 'Downtown Dubai', label: 'Downtown Dubai' },
  { value: 'Downtown UAQ', label: 'Downtown UAQ' },
  { value: 'Dubai Creek Harbour', label: 'Dubai Creek Harbour' },
  { value: 'Dubai Design District', label: 'Dubai Design District' },
  { value: 'Dubai Harbour', label: 'Dubai Harbour' },
  { value: 'Dubai Hills Estate', label: 'Dubai Hills Estate' },
  { value: 'Dubai International City', label: 'Dubai International City' },
  { value: 'Dubai Investment Park', label: 'Dubai Investment Park' },
  { value: 'Dubai Islands', label: 'Dubai Islands' },
  { value: 'Dubai Marina', label: 'Dubai Marina' },
  { value: 'Dubai Maritime City', label: 'Dubai Maritime City' },
  { value: 'Dubai Motor City', label: 'Dubai Motor City' },
  { value: 'Dubai Production City', label: 'Dubai Production City' },
  { value: 'Dubai Science Park', label: 'Dubai Science Park' },
  { value: 'Dubai Silicon Oasis', label: 'Dubai Silicon Oasis' },
  { value: 'Dubai South', label: 'Dubai South' },
  { value: 'Emaar South', label: 'Emaar South' },
  { value: 'Expo City', label: 'Expo City' },
  { value: 'Dubai Sports City', label: 'Dubai Sports City' },
  { value: 'Dubai Studio City', label: 'Dubai Studio City' },
  { value: 'Dubai Water Canal', label: 'Dubai Water Canal' },
  { value: 'Dubailand', label: 'Dubailand' },
  { value: 'Athlon', label: 'Athlon' },
  { value: 'Damac Islands', label: 'Damac Islands' },
  { value: 'Damac Sun City', label: 'Damac Sun City' },
  { value: 'Ghaf Woods', label: 'Ghaf Woods' },
  { value: 'Haven', label: 'Haven' },
  { value: 'Mudon', label: 'Mudon' },
  { value: 'Sobha Elwood', label: 'Sobha Elwood' },
  { value: 'Sobha Reserve', label: 'Sobha Reserve' },
  { value: 'The Acres', label: 'The Acres' },
  { value: 'The Valley', label: 'The Valley' },
  { value: 'The Wilds', label: 'The Wilds' },
  { value: 'Town Square', label: 'Town Square' },
  { value: 'Villanova', label: 'Villanova' },
  { value: 'Emaar Beachfront', label: 'Emaar Beachfront' },
  { value: 'Emirates Living', label: 'Emirates Living' },
  { value: 'Emirates Hills', label: 'Emirates Hills' },
  { value: 'Fahid Island', label: 'Fahid Island' },
  { value: 'Grand Polo Club and Resort', label: 'Grand Polo Club and Resort' },
  { value: 'Jebel Ali Village', label: 'Jebel Ali Village' },
  { value: 'Jumeirah', label: 'Jumeirah' },
  { value: 'Jumeirah Bay', label: 'Jumeirah Bay' },
  { value: 'Jumeirah Beach Residence', label: 'Jumeirah Beach Residence' },
  { value: 'Jumeirah Garden City', label: 'Jumeirah Garden City' },
  { value: 'Jumeirah Golf Estates', label: 'Jumeirah Golf Estates' },
  { value: 'Jumeirah Islands', label: 'Jumeirah Islands' },
  { value: 'Jumeirah Lake Towers', label: 'Jumeirah Lake Towers' },
  { value: 'Jumeirah Park', label: 'Jumeirah Park' },
  { value: 'Jumeirah Village Circle', label: 'Jumeirah Village Circle' },
  { value: 'Jumeirah Village Triangle', label: 'Jumeirah Village Triangle' },
  { value: 'Madinat Jumeirah Living', label: 'Madinat Jumeirah Living' },
  { value: 'Maryam Island', label: 'Maryam Island' },
  { value: 'Masaar', label: 'Masaar' },
  { value: 'MBR City', label: 'MBR City' },
  { value: 'Azizi Riviera', label: 'Azizi Riviera' },
  { value: 'District One', label: 'District One' },
  { value: 'Eden Hills', label: 'Eden Hills' },
  { value: 'Meydan', label: 'Meydan' },
  { value: 'Sobha Hartland', label: 'Sobha Hartland' },
  { value: 'Sobha Hartland II', label: 'Sobha Hartland II' },
  { value: 'Mina Al Arab', label: 'Mina Al Arab' },
  { value: 'Downtown Mina', label: 'Downtown Mina' },
  { value: 'Hayat Island', label: 'Hayat Island' },
  { value: 'Nad Al Sheba Gardens', label: 'Nad Al Sheba Gardens' },
  { value: 'Palm Jebel Ali', label: 'Palm Jebel Ali' },
  { value: 'Palm Jumeirah', label: 'Palm Jumeirah' },
  { value: 'Port De La Mer', label: 'Port De La Mer' },
  { value: 'Rahman Island', label: 'Rahman Island' },
  { value: 'Rashid Yachts and Marina', label: 'Rashid Yachts and Marina' },
  { value: 'Saadiyat Island', label: 'Saadiyat Island' },
  { value: 'Sheikh Zayed Road', label: 'Sheikh Zayed Road' },
  { value: 'Siniya Island', label: 'Siniya Island' },
  { value: 'The Heights Country Club and Wellness', label: 'The Heights Country Club and Wellness' },
  { value: 'The Oasis', label: 'The Oasis' },
  { value: 'Tilal Al Ghaf', label: 'Tilal Al Ghaf' },
  { value: 'Wasl Gate', label: 'Wasl Gate' },
  { value: 'Yas Island', label: 'Yas Island' },
  { value: 'Za\'abeel', label: 'Za\'abeel' },
];

export const CITIES = [
  { value: 'Dubai', label: 'Dubai' },
  { value: 'Abu Dhabi', label: 'Abu Dhabi' },
  { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
  { value: 'Sharjah', label: 'Sharjah' },
  { value: 'Umm Al Quwain', label: 'Umm Al Quwain' },
  { value: 'Ajman', label: 'Ajman' },
  { value: 'Fujairah', label: 'Fujairah' },
];

// View options for properties
export const VIEW_OPTIONS = [
  { value: 'Burj Khalifa View', label: 'Burj Khalifa View' },
  { value: 'Sea View', label: 'Sea View' },
  { value: 'Lagoon View', label: 'Lagoon View' },
  { value: 'Canal View', label: 'Canal View' },
  { value: 'Community View', label: 'Community View' },
  { value: 'Park View', label: 'Park View' },
  { value: 'Golf View', label: 'Golf View' },
  { value: 'Road View', label: 'Road View' },
  { value: 'City View', label: 'City View' },
];

// Sort options for properties list
export const SORT_OPTIONS = [
  { value: 'date_new_old', label: 'Date (New → Old)' },
  { value: 'date_old_new', label: 'Date (Old → New)' },
  { value: 'price_low_high', label: 'Price (Low → High)' },
  { value: 'price_high_low', label: 'Price (High → Low)' },
];

// Subtype options based on segment
export const getSubtypeOptions = (segment: string) => {
  if (segment === 'residential') {
    return [
      { value: 'apartment', label: 'Apartment' },
      { value: 'townhouse', label: 'Townhouse' },
      { value: 'villa', label: 'Villa' },
      { value: 'plot', label: 'Plot' },
      { value: 'building', label: 'Building' },
      { value: 'penthouse', label: 'Penthouse' },
    ];
  } else if (segment === 'commercial') {
    return [
      { value: 'office', label: 'Office' },
      { value: 'shop', label: 'Shop' },
      { value: 'villa', label: 'Villa' },
      { value: 'plot', label: 'Plot' },
      { value: 'building', label: 'Building' },
      { value: 'warehouse', label: 'Warehouse' },
    ];
  }
  return [];
};