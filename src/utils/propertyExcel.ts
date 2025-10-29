import * as XLSX from 'xlsx';
import { Property } from '@/hooks/useProperties';

export interface PropertyExcelRow {
  slug?: string;
  title: string;
  status: 'available' | 'pending' | 'sold' | 'off_market' | 'vacant' | 'rented' | 'in_development';
  segment?: 'residential' | 'commercial';
  property_type: string;
  subtype?: string;
  offer_type: 'rent' | 'sale';
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  price: number;
  city: string;
  address: string;
  unit_number?: string;
  view?: string;
  description?: string;
  permit_number?: string;
  is_furnished?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  row: number;
  reason?: string;
  data?: PropertyExcelRow;
}

export interface ImportPreview {
  add: PropertyExcelRow[];
  update: PropertyExcelRow[];
  skip: Array<{ row: number; data: any; reason: string }>;
}

// Generate slug from title
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Normalize boolean values
const normalizeBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  return false;
};

// Validate row data
export const validateRow = (row: any, rowIndex: number): ValidationResult => {
  // Check required fields
  if (!row.title || String(row.title).trim() === '') {
    return { valid: false, row: rowIndex, reason: 'Missing title' };
  }

  // Validate status
  const validStatuses = ['available', 'pending', 'sold', 'off_market', 'vacant', 'rented', 'in_development', 'draft'];
  const status = row.status?.toLowerCase() || 'draft';
  if (!validStatuses.includes(status)) {
    return { valid: false, row: rowIndex, reason: `Invalid status: ${row.status}` };
  }

  // Validate offer_type
  if (!row.offer_type || !['rent', 'sale'].includes(row.offer_type?.toLowerCase())) {
    return { valid: false, row: rowIndex, reason: 'offer_type must be "rent" or "sale"' };
  }

  // Validate property_type
  if (!row.property_type || String(row.property_type).trim() === '') {
    return { valid: false, row: rowIndex, reason: 'Missing property_type' };
  }

  // Validate numbers
  if (row.bedrooms !== undefined && row.bedrooms !== null && row.bedrooms !== '') {
    const bedrooms = Number(row.bedrooms);
    if (isNaN(bedrooms) || bedrooms < 0) {
      return { valid: false, row: rowIndex, reason: 'Invalid bedrooms value' };
    }
  }

  if (row.bathrooms !== undefined && row.bathrooms !== null && row.bathrooms !== '') {
    const bathrooms = Number(row.bathrooms);
    if (isNaN(bathrooms) || bathrooms < 0) {
      return { valid: false, row: rowIndex, reason: 'Invalid bathrooms value' };
    }
  }

  if (row.area_sqft !== undefined && row.area_sqft !== null && row.area_sqft !== '') {
    const area = Number(row.area_sqft);
    if (isNaN(area) || area < 0) {
      return { valid: false, row: rowIndex, reason: 'Invalid area_sqft value' };
    }
  }

  if (!row.price || row.price === '') {
    return { valid: false, row: rowIndex, reason: 'Missing price' };
  }

  const price = Number(row.price);
  if (isNaN(price) || price < 0) {
    return { valid: false, row: rowIndex, reason: 'Invalid price value' };
  }

  // Generate slug if missing
  const slug = row.slug && String(row.slug).trim() !== '' 
    ? String(row.slug).trim()
    : generateSlug(String(row.title));

  // Build normalized data
  const data: PropertyExcelRow = {
    slug,
    title: String(row.title).trim(),
    status: (status === 'draft' ? 'available' : status) as PropertyExcelRow['status'],
    segment: row.segment?.toLowerCase() as 'residential' | 'commercial' | undefined,
    property_type: String(row.property_type).trim(),
    subtype: row.subtype ? String(row.subtype).trim() : undefined,
    offer_type: row.offer_type.toLowerCase() as 'rent' | 'sale',
    bedrooms: row.bedrooms !== undefined && row.bedrooms !== null && row.bedrooms !== '' ? Number(row.bedrooms) : undefined,
    bathrooms: row.bathrooms !== undefined && row.bathrooms !== null && row.bathrooms !== '' ? Number(row.bathrooms) : undefined,
    area_sqft: row.area_sqft !== undefined && row.area_sqft !== null && row.area_sqft !== '' ? Number(row.area_sqft) : undefined,
    price: Number(row.price),
    city: row.city ? String(row.city).trim() : 'Dubai',
    address: row.address ? String(row.address).trim() : '',
    unit_number: row.unit_number ? String(row.unit_number).trim() : undefined,
    view: row.view ? String(row.view).trim() : undefined,
    description: row.description ? String(row.description).trim() : undefined,
    permit_number: row.permit_number ? String(row.permit_number).trim() : undefined,
    is_furnished: row.is_furnished !== undefined ? normalizeBoolean(row.is_furnished) : undefined,
  };

  return { valid: true, row: rowIndex, data };
};

// Parse Excel file
export const parseExcelFile = async (file: File): Promise<PropertyExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve(jsonData as PropertyExcelRow[]);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it\'s a valid .xlsx file.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

// Generate Excel template
export const generateTemplate = (): void => {
  const headers = [
    'slug',
    'title',
    'status',
    'segment',
    'property_type',
    'subtype',
    'offer_type',
    'bedrooms',
    'bathrooms',
    'area_sqft',
    'price',
    'city',
    'address',
    'unit_number',
    'view',
    'description',
    'permit_number',
    'is_furnished'
  ];

  const sampleData = [
    {
      slug: 'luxury-villa-palm-jumeirah',
      title: 'Luxury Villa in Palm Jumeirah',
      status: 'available',
      segment: 'residential',
      property_type: 'Villa',
      subtype: 'Detached',
      offer_type: 'sale',
      bedrooms: 5,
      bathrooms: 6,
      area_sqft: 8500,
      price: 15000000,
      city: 'Dubai',
      address: 'Palm Jumeirah, Frond N',
      unit_number: 'Villa 101',
      view: 'Sea View',
      description: 'Stunning 5-bedroom villa with private beach access',
      permit_number: 'DLD-2024-12345',
      is_furnished: 'Yes'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  
  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'properties');

  // Add instructions sheet
  const instructions = [
    ['DKV Properties Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in property data in the "properties" sheet'],
    ['2. Required fields: title, property_type, offer_type, price, city'],
    ['3. status must be: available, pending, sold, off_market, vacant, rented, in_development'],
    ['4. offer_type must be: rent or sale'],
    ['5. segment: residential or commercial (optional)'],
    ['6. Numbers (bedrooms, bathrooms, area_sqft, price) must be numeric values >= 0'],
    ['7. is_furnished: TRUE/FALSE or Yes/No'],
    ['8. slug: leave empty to auto-generate from title'],
    ['9. Upload will upsert by slug (update if exists, add if new)'],
    [''],
    ['Sample data is provided in the "properties" sheet for reference.']
  ];

  const instructionsWs = XLSX.utils.aoa_to_sheet(instructions);
  instructionsWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

  XLSX.writeFile(wb, 'dkv-properties-template.xlsx');
};

// Export properties to Excel
export const exportPropertiesToExcel = (properties: Property[], filters?: any): void => {
  const data = properties.map(p => ({
    slug: p.id, // Using ID as slug since slug field doesn't exist in Property type
    title: p.title,
    status: p.status,
    segment: p.segment || '',
    property_type: p.property_type,
    subtype: p.subtype || '',
    offer_type: p.offer_type,
    bedrooms: p.bedrooms || '',
    bathrooms: p.bathrooms || '',
    area_sqft: p.area_sqft || '',
    price: p.price,
    city: p.city,
    address: p.address,
    unit_number: p.unit_number || '',
    view: p.view || '',
    description: p.description || '',
    permit_number: p.permit_number || '',
    agent_name: p.profiles?.name || '',
    agent_email: p.profiles?.email || '',
    created_at: new Date(p.created_at).toLocaleDateString(),
    updated_at: new Date(p.updated_at).toLocaleDateString(),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const cols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Properties');

  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  const filename = `properties_${timestamp}.xlsx`;
  
  XLSX.writeFile(wb, filename);
};
