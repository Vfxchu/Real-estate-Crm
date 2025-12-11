import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Location {
  id: string;
  name: string;
  created_at: string;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addLocation = useCallback(async (name: string): Promise<Location | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: 'Invalid location',
        description: 'Location name cannot be empty',
        variant: 'destructive',
      });
      return null;
    }

    // Check if location already exists
    const existing = locations.find(
      loc => loc.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      toast({
        title: 'Location exists',
        description: 'This location already exists in the system',
        variant: 'destructive',
      });
      return existing;
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .insert([{ name: trimmedName }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Location exists',
            description: 'This location already exists in the system',
            variant: 'destructive',
          });
          return null;
        }
        throw error;
      }

      setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Location added',
        description: `"${trimmedName}" has been added successfully`,
      });

      return data;
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error adding location',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [locations, toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    addLocation,
    refetch: fetchLocations,
  };
}
