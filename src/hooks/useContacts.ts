import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ContactStatus = 'lead' | 'active_client' | 'past_client';

export function normalizePhone(p?: string) {
  return (p || '').replace(/\D/g, '');
}

export function useContacts() {
  const { user, profile } = useAuth();

  const list = useCallback(async (opts: {
    q?: string;
    status?: 'all' | ContactStatus;
    tags?: string[];
    limit?: number;
    includeMerged?: boolean;
  } = {}) => {
    const { q, status = 'all', tags = [], limit = 50, includeMerged = false } = opts;
    
    let query = supabase
      .from('leads')
      .select('*, profiles(name, email)')
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    // Filter out merged contacts unless explicitly requested
    if (!includeMerged) {
      query = query.is('merged_into_id', null);
    }
    
    // Filter by contact status
    if (status !== 'all') {
      query = query.eq('contact_status', status);
    }
    
    // Search query across name, email, phone
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
    }
    
    // Filter by tags using array contains operator
    if (tags.length) {
      query = query.contains('tags', tags);
    }
    
    return await query;
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
    updateContact,
    mergeContacts,
    potentialDuplicates,
    toCSV,
    getActivities
  };
}