import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createDeal, listDeals, updateDeal, deleteDeal, getDeal, type DealPayload } from '@/services/deals';

export type Deal = {
  id: string;
  title: string;
  contact_id: string;
  property_id?: string | null;
  agent_id: string;
  status: string; // Allow any string from DB
  value?: number | null;
  currency?: string | null;
  close_date?: string | null;
  probability?: number | null;
  notes?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  // Relations (optional as they may not always be included)
  leads?: {
    name: string;
    email: string;
    phone?: string | null;
    contact_status?: string;
  } | null;
  properties?: {
    title: string;
    address: string;
    city?: string;
    price?: number;
  } | null;
  profiles?: {
    name: string;
    email: string;
  } | null;
};

export const useDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchDeals = async (opts?: {
    status?: string;
    contact_id?: string;
    property_id?: string;
  }) => {
    try {
      setLoading(true);
      const { rows, error } = await listDeals(opts);

      if (error) throw error;

      setDeals(rows as any);
    } catch (error: any) {
      toast({
        title: 'Error fetching deals',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewDeal = async (dealData: DealPayload) => {
    try {
      const { data, error } = await createDeal(dealData);

      if (error) throw error;

      setDeals(prev => [data as any, ...prev]);
      toast({
        title: 'Deal created',
        description: 'New deal has been added successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error creating deal',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateExistingDeal = async (id: string, updates: Partial<DealPayload>) => {
    try {
      const { data, error } = await updateDeal(id, updates);

      if (error) throw error;

      setDeals(prev => prev.map(deal => deal.id === id ? { ...deal, ...(data as any) } : deal));
      toast({
        title: 'Deal updated',
        description: 'Deal has been updated successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error updating deal',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteExistingDeal = async (id: string) => {
    try {
      const { error } = await deleteDeal(id);

      if (error) throw error;

      setDeals(prev => prev.filter(deal => deal.id !== id));
      toast({
        title: 'Deal deleted',
        description: 'Deal has been deleted successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error deleting deal',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const getSingleDeal = async (id: string) => {
    try {
      const { data, error } = await getDeal(id);
      if (error) throw error;
      return { data: data as any, error: null };
    } catch (error: any) {
      toast({
        title: 'Error fetching deal',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchDeals();
    }
  }, [user, profile]);

  return {
    deals,
    loading,
    fetchDeals,
    createDeal: createNewDeal,
    updateDeal: updateExistingDeal,
    deleteDeal: deleteExistingDeal,
    getDeal: getSingleDeal,
  };
};