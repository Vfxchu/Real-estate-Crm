import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Property {
  id: string;
  title: string;
  description?: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  status: 'available' | 'pending' | 'sold' | 'off_market';
  featured?: boolean;
  images?: string[];
  agent_id?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchProperties = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_agent_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // If user is an agent, only show their properties
      if (profile?.role === 'agent') {
        query = query.eq('agent_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProperties((data as Property[]) || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching properties',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProperty = async (propertyData: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (error) throw error;

      setProperties(prev => [data as Property, ...prev]);
      toast({
        title: 'Property created',
        description: 'New property has been added successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error creating property',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProperties(prev => prev.map(property => property.id === id ? { ...property, ...(data as Property) } : property));
      toast({
        title: 'Property updated',
        description: 'Property has been updated successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error updating property',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProperties(prev => prev.filter(property => property.id !== id));
      toast({
        title: 'Property deleted',
        description: 'Property has been deleted successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error deleting property',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user, profile]);

  return {
    properties,
    loading,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
  };
};