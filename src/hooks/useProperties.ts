import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatErrorForUser } from '@/lib/error-handler';

export interface Property {
  id: string;
  title: string;
  description?: string;
  property_type: string;
  segment?: 'residential' | 'commercial';
  subtype?: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  unit_number?: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  status: 'available' | 'pending' | 'sold' | 'off_market' | 'vacant' | 'rented' | 'in_development';
  offer_type: 'rent' | 'sale'; // Required field
  featured?: boolean;
  images?: string[];
  agent_id: string; // Required field
  permit_number?: string;
  owner_contact_id?: string;
  location_place_id?: string;
  location_lat?: number;
  location_lng?: number;
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
          id,title,segment,subtype,address,city,state,zip_code,status,offer_type,price,
          bedrooms,bathrooms,area_sqft,owner_contact_id,agent_id,created_at,updated_at,images,
          profiles!properties_agent_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Agents and Admins should see all properties – no owner filter
      const { data, error } = await query;

      if (error) throw error;

      setProperties((data as Property[]) || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching properties',
        description: formatErrorForUser(error, 'fetchProperties'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProperty = async (propertyData: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
    try {
      // Direct insert - simplified, no RPC
      const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select(`
          *,
          profiles!properties_agent_id_fkey (
            name,
            email
          )
        `)
        .single();

      if (error) throw error;

      // Add to state immediately for instant UI update
      const newProperty = { ...data, profiles: data.profiles } as Property;
      setProperties(prev => [newProperty, ...prev]);
      
      toast({
        title: 'Property created successfully',
        description: 'New property has been added to your listings.',
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Property creation error:', error);
      toast({
        title: 'Error creating property',
        description: formatErrorForUser(error, 'createProperty'),
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
        description: formatErrorForUser(error, 'updateProperty'),
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      // First delete associated images from storage
      const property = properties.find(p => p.id === id);
      if (property?.images?.length) {
        const imagePaths = property.images.map(url => {
          const urlParts = url.split('/');
          return `${id}/${urlParts[urlParts.length - 1]}`;
        });
        
        await supabase.storage
          .from('property-images')
          .remove(imagePaths);
      }

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
        description: formatErrorForUser(error, 'deleteProperty'),
        variant: 'destructive',
      });
      return { error };
    }
  };

  const uploadPropertyImage = async (propertyId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${propertyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      return { data: publicUrl, error: null };
    } catch (error: any) {
      toast({
        title: 'Error uploading image',
        description: formatErrorForUser(error, 'uploadPropertyImage'),
        variant: 'destructive',
      });
      return { data: null, error };
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
    uploadPropertyImage,
  };
};