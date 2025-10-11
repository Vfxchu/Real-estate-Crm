import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ContactStatus = 'lead' | 'active_client' | 'past_client';

export function normalizePhone(p?: string) {
  return (p || '').replace(/\D/g, '');
}

export function useContacts() {
  const { user, profile } = useAuth();

  // Create new contact with round-robin assignment
  const createContact = useCallback(async (contactData: any) => {
    const { data, error } = await supabase
      .from('leads')
      .insert([contactData]) // Auto-assignment happens via trigger
      .select(`
        *
      `)
      .single();
    
    return { data, error };
  }, []);

  const list = useCallback(async (opts: {
    q?: string;
    status_category?: 'all' | ContactStatus;
    interest_type?: 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor' | 'all';
    page?: number;
    pageSize?: number;
    filters?: Partial<{
      source: string;
      segment: string;
      subtype: string;
      bedrooms: string;
      size_band: string;
      location_address: string;
      contact_pref: string;
      tags: string[];
      interest_tags: string;
      category: string;
      budget_sale_band: string;
      budget_rent_band: string;
    }>;
  } = {}) => {
    const { q, status_category = 'all', interest_type = 'all', page = 1, pageSize = 25, filters = {} } = opts;

    // 1) Fetch "master contacts" derived from leads (existing behavior)
    const { listLeads } = await import("@/services/leads");
    const { rows, error } = await listLeads({
      q,
      status_category: status_category === 'all' ? undefined : status_category,
      interest_type: interest_type === 'all' ? undefined : interest_type,
      page,
      pageSize,
      source: filters.source,
      filters: {
        segment: filters.segment,
        subtype: filters.subtype,
        bedrooms: filters.bedrooms,
        size_band: filters.size_band,
        location_address: filters.location_address,
        interest_tags: filters.interest_tags,
        category: filters.category,
        budget_sale_band: filters.budget_sale_band,
        budget_rent_band: filters.budget_rent_band,
        contact_pref: filters.contact_pref,
      },
    });

    const masterContactsFromLeads = rows.filter((contact: any) => !contact.contact_id || contact.contact_status !== 'lead');

    // 2) Fetch "real" contacts from contacts table (new owners created via property form)
    // Apply simple search on full_name/email/phone
    let contactsQuery = supabase
      .from('contacts')
      .select('id, full_name, email, phone, status_effective, created_by, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (q && q.trim()) {
      const term = q.trim();
      contactsQuery = contactsQuery.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data: rawContacts, error: contactsError } = await contactsQuery;
    if (contactsError) {
      return { data: masterContactsFromLeads, total: masterContactsFromLeads.length, error: contactsError } as const;
    }

    const mappedContacts = (rawContacts || []).map((c: any) => ({
      id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.phone,
      contact_status: c.status_effective === 'past' ? 'past_client' : 'active_client',
      created_by: c.created_by,
      updated_at: c.updated_at,
      created_at: c.created_at,
      // mark as pure contact (not a lead)
      _source: 'contacts'
    }));

    // 3) Merge both sources and de-duplicate by best available key
    const keyOf = (r: any) => (r.email?.toLowerCase()?.trim()) || (normalizePhone(r.phone) || '') || r.id;
    const mergedMap = new Map<string, any>();

    for (const r of masterContactsFromLeads) {
      mergedMap.set(keyOf(r), r);
    }
    for (const r of mappedContacts) {
      const key = keyOf(r);
      // Prefer existing lead row if already present; otherwise add contact
      if (!mergedMap.has(key)) mergedMap.set(key, r);
    }

    const merged = Array.from(mergedMap.values());
    return { data: merged, total: merged.length, error } as const;
  }, []);

  // Get all leads for a specific contact
  const getContactLeads = useCallback(async (contactId: string) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or(`id.eq.${contactId},contact_id.eq.${contactId}`)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  }, []);

  const updateContact = useCallback(async (id: string, patch: Partial<{
    contact_status: ContactStatus;
    tags: string[];
    custom_fields: Record<string, any>;
  }>) => {
    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }, []);

  const mergeContacts = useCallback(async (primaryId: string, duplicateIds: string[]) => {
    if (!duplicateIds.length) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('leads')
      .update({ merged_into_id: primaryId })
      .in('id', duplicateIds);
    
    return { data, error };
  }, []);

  const potentialDuplicates = useCallback((rows: any[]) => {
    const groups = new Map<string, any[]>();
    
    for (const row of rows) {
      const emailKey = row.email?.toLowerCase().trim();
      const phoneKey = normalizePhone(row.phone);
      
      // Group by email if exists
      if (emailKey) {
        const emailGroup = groups.get(`email:${emailKey}`) || [];
        emailGroup.push(row);
        groups.set(`email:${emailKey}`, emailGroup);
      }
      
      // Group by phone if exists and has enough digits
      if (phoneKey && phoneKey.length >= 10) {
        const phoneGroup = groups.get(`phone:${phoneKey}`) || [];
        phoneGroup.push(row);
        groups.set(`phone:${phoneKey}`, phoneGroup);
      }
    }
    
    // Return only groups with duplicates
    return [...groups.values()].filter(group => group.length > 1);
  }, []);

  const toCSV = useCallback((rows: any[]) => {
    const headers = ['name', 'email', 'phone', 'contact_status', 'tags', 'status', 'source', 'notes'];
    const lines = [headers.join(',')];
    
    for (const row of rows) {
      const values = [
        row.name || '',
        row.email || '',
        row.phone || '',
        row.contact_status || 'lead',
        (row.tags || []).join('|'),
        row.status || '',
        row.source || '',
        (row.notes || '').toString().replace(/\n/g, ' ').replace(/,/g, ';'),
      ];
      
      // Escape CSV values
      const escapedValues = values.map(v => 
        `"${String(v).replace(/"/g, '""')}"`
      );
      lines.push(escapedValues.join(','));
    }
    
    return lines.join('\n');
  }, []);

  const getActivities = useCallback(async (leadId: string) => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  }, []);

  return {
    list,
    createContact,
    updateContact,
    mergeContacts,
    potentialDuplicates,
    toCSV,
    getActivities,
    getContactLeads
  };
}