import * as XLSX from 'xlsx';
import { Lead } from '@/types';

/**
 * Export leads/contacts to CSV with proper formatting
 */
export function exportLeadsToCSV(leads: Lead[], filename: string = 'leads_export.csv') {
  // Define headers in a logical order
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Status',
    'Priority',
    'Contact Status',
    'Source',
    'Category',
    'Segment',
    'Subtype',
    'Interest Tags',
    'Bedrooms',
    'Budget Sale Band',
    'Budget Rent Band',
    'Size Band',
    'Location',
    'Contact Preferences',
    'Notes',
    'Agent Name',
    'Created At',
    'Updated At'
  ];

  // Convert leads to rows
  const rows = leads.map(lead => [
    lead.name || '',
    lead.email || '',
    lead.phone || '',
    lead.status || 'new',
    lead.priority || 'medium',
    lead.contact_status || 'lead',
    lead.lead_source || lead.source || '',
    lead.category || '',
    lead.segment || '',
    lead.subtype || '',
    (lead.interest_tags || []).join('|'),
    lead.bedrooms || '',
    lead.budget_sale_band || '',
    lead.budget_rent_band || '',
    lead.size_band || '',
    lead.location_address || '',
    (lead.contact_pref || []).join('|'),
    (lead.notes || '').replace(/\n/g, ' ').replace(/,/g, ';'),
    (lead as any).profiles?.name || '',
    lead.created_at ? new Date(lead.created_at).toLocaleString() : '',
    lead.updated_at ? new Date(lead.updated_at).toLocaleString() : ''
  ]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 12 }, // Status
    { wch: 10 }, // Priority
    { wch: 15 }, // Contact Status
    { wch: 15 }, // Source
    { wch: 12 }, // Category
    { wch: 15 }, // Segment
    { wch: 15 }, // Subtype
    { wch: 20 }, // Interest Tags
    { wch: 10 }, // Bedrooms
    { wch: 18 }, // Budget Sale Band
    { wch: 18 }, // Budget Rent Band
    { wch: 12 }, // Size Band
    { wch: 30 }, // Location
    { wch: 20 }, // Contact Preferences
    { wch: 40 }, // Notes
    { wch: 20 }, // Agent Name
    { wch: 18 }, // Created At
    { wch: 18 }  // Updated At
  ];

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Generate CSV
  XLSX.writeFile(wb, filename);
}

/**
 * Export leads/contacts to Excel with better formatting
 */
export function exportLeadsToExcel(leads: Lead[], filename: string = 'leads_export.xlsx') {
  exportLeadsToCSV(leads, filename);
}
