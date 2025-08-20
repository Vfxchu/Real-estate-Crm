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

export const PROPERTY_STATUS = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'rented', label: 'Rented' },
  { value: 'in_development', label: 'In Development' },
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