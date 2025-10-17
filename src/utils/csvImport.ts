import * as XLSX from 'xlsx';
import { Lead } from '@/types';

export interface ImportedLead {
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  contact_status?: string;
  source?: string;
  category?: 'property' | 'requirement';
  segment?: 'residential' | 'commercial';
  subtype?: string;
  interest_tags?: string[];
  bedrooms?: string;
  budget_sale_band?: string;
  budget_rent_band?: string;
  size_band?: string;
  location_address?: string;
  contact_pref?: string[];
  notes?: string;
}

/**
 * Parse CSV/Excel file and return structured lead data
 */
export async function parseLeadsFromFile(file: File): Promise<ImportedLead[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          throw new Error('File must contain headers and at least one data row');
        }

        // Parse headers (case-insensitive)
        const headers = jsonData[0].map((h: string) => 
          String(h).toLowerCase().trim().replace(/\s+/g, '_')
        );

        // Map rows to lead objects
        const leads: ImportedLead[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const lead: any = {};

          headers.forEach((header, index) => {
            const value = row[index];
            if (value === undefined || value === null || value === '') return;

            // Map common header variations
            const headerMap: Record<string, string> = {
              'name': 'name',
              'full_name': 'name',
              'contact_name': 'name',
              'email': 'email',
              'email_address': 'email',
              'phone': 'phone',
              'phone_number': 'phone',
              'mobile': 'phone',
              'status': 'status',
              'lead_status': 'status',
              'priority': 'priority',
              'contact_status': 'contact_status',
              'source': 'source',
              'lead_source': 'source',
              'category': 'category',
              'segment': 'segment',
              'subtype': 'subtype',
              'property_type': 'subtype',
              'interest_tags': 'interest_tags',
              'interests': 'interest_tags',
              'tags': 'interest_tags',
              'bedrooms': 'bedrooms',
              'budget_sale_band': 'budget_sale_band',
              'sale_budget': 'budget_sale_band',
              'budget_rent_band': 'budget_rent_band',
              'rent_budget': 'budget_rent_band',
              'size_band': 'size_band',
              'location': 'location_address',
              'location_address': 'location_address',
              'address': 'location_address',
              'contact_pref': 'contact_pref',
              'contact_preferences': 'contact_pref',
              'notes': 'notes',
              'comments': 'notes'
            };

            const mappedKey = headerMap[header];
            if (mappedKey) {
              // Handle array fields (split by pipe or comma)
              if (mappedKey === 'interest_tags' || mappedKey === 'contact_pref') {
                lead[mappedKey] = String(value).split(/[|,]/).map(v => v.trim()).filter(Boolean);
              } else {
                lead[mappedKey] = String(value).trim();
              }
            }
          });

          // Validate required field
          if (lead.name) {
            // Normalize status - if status is provided, use it; otherwise default based on contact_status
            if (!lead.status) {
              lead.status = determineLeadStatus(lead);
            }

            // Ensure priority has valid value
            if (lead.priority && !['low', 'medium', 'high'].includes(lead.priority.toLowerCase())) {
              lead.priority = 'medium';
            } else if (lead.priority) {
              lead.priority = lead.priority.toLowerCase();
            }

            leads.push(lead as ImportedLead);
          }
        }

        resolve(leads);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Determine lead status based on contact_status or other fields
 * This addresses the bug where all imported leads were marked as "New - Not Contacted"
 */
function determineLeadStatus(lead: Partial<ImportedLead>): string {
  // If contact_status indicates they're already a client, set appropriate status
  if (lead.contact_status) {
    const contactStatus = lead.contact_status.toLowerCase();
    
    if (contactStatus.includes('active') || contactStatus.includes('client')) {
      return 'contacted'; // Active clients should be in contacted or qualified status
    }
    
    if (contactStatus.includes('past')) {
      return 'lost'; // Past clients
    }
  }

  // If they have notes or interaction history, they've likely been contacted
  if (lead.notes && lead.notes.length > 20) {
    return 'contacted';
  }

  // Default to new for actual new leads
  return 'new';
}

/**
 * Validate imported lead data
 */
export function validateImportedLead(lead: ImportedLead): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field
  if (!lead.name || lead.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  // Email validation (if provided)
  if (lead.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      errors.push('Invalid email format');
    }
  }

  // Phone validation (if provided)
  if (lead.phone) {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errors.push('Phone number must have at least 10 digits');
    }
  }

  // At least one contact method required
  if (!lead.email && !lead.phone) {
    errors.push('Either email or phone is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
