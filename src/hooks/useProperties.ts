import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatErrorForUser } from '@/lib/error-handler';
import { getSecureImageUrl } from '@/services/storage';

export interface Property {
  id: string;
  title: string;
  description?: string | null;
  property_type: string;
  segment?: string | null;
  subtype?: string | null;
  address: string;
  city: string;
  state: string;
  zip_code?: string | null;
  unit_number?: string | null;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
  status: string;
  offer_type: string; // Required field
  featured?: boolean | null;
  images?: string[] | null;
  agent_id: string; // Required field
  permit_number?: string | null;
  owner_contact_id?: string | null;
  location_place_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  view?: string | null;
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
      console.log('[PROPERTIES] Fetching properties...');
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[PROPERTIES] Query result:', { data: data?.length || 0 });

      // Fetch profile data separately for each property that has an agent_id
      const propertiesWithProfiles = await Promise.all(
        (data || []).map(async (property) => {
          let profileData = null;
          
          if (property.agent_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('user_id', property.agent_id)
              .single();
            
            profileData = profile || { name: 'Unknown', email: 'unknown@example.com' };
          } else {
            profileData = { name: 'Unknown', email: 'unknown@example.com' };
          }

          // Transform image URLs to secure signed URLs
          const secureImages = property.images ? await Promise.all(
            property.images.map(async (imagePath: string) => {
              if (imagePath.startsWith('http')) {
                return imagePath; // Already a full URL
              }
              return await getSecureImageUrl('property-images', imagePath) || imagePath;
            })
          ) : [];
          
          return {
            ...property,
            images: secureImages,
            profiles: profileData
          };
        })
      );

      console.log('[PROPERTIES] Final data with profiles:', propertiesWithProfiles.length);
      setProperties(propertiesWithProfiles as Property[]);
    } catch (error: any) {
      console.error('[PROPERTIES] Error fetching properties:', error);
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
      console.log('[PROPERTIES] Creating property:', propertyData);
      // Direct insert - simplified, no RPC
      const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select('*')
        .single();

      if (error) throw error;

      // Fetch the profile data separately if the property has an agent_id
      let propertyWithProfile = data;
      if (data?.agent_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', data.agent_id)
          .single();
        
      propertyWithProfile = {
        ...data,
        profiles: profileData || { name: 'Unknown', email: 'unknown@example.com' }
      } as any;
      }

      console.log('[PROPERTIES] Property created successfully');
      // Add to state immediately for instant UI update
      setProperties(prev => [propertyWithProfile as Property, ...prev]);
      
      toast({
        title: 'Property created successfully',
        description: 'New property has been added to your listings.',
      });

      return { data: propertyWithProfile, error: null };
    } catch (error: any) {
      console.error('[PROPERTIES] Property creation error:', error);
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

      // Create a signed URL instead of public URL for security
      const signedUrl = await getSecureImageUrl('property-images', filePath);
      
      return { data: signedUrl, error: null };
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

  const addActivity = async (propertyId: string, type: string, description: string, leadId?: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          property_id: propertyId,
          lead_id: leadId || null,
          type,
          description,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast({
        title: 'Activity added',
        description: 'Activity has been logged successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error adding activity',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Set up initial fetch and real-time subscriptions
  useEffect(() => {
    if (user) {
      fetchProperties();
      
      // Set up real-time subscription for property updates
      const channel = supabase
        .channel('properties-changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'properties'
        }, async (payload) => {
          console.log('[PROPERTIES] Real-time update received:', payload);
          const updatedProperty = payload.new as any;
          
          // Fetch profile data if agent changed
          let profileData = null;
          if (updatedProperty.agent_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('user_id', updatedProperty.agent_id)
              .single();
            
            profileData = profile || { name: 'Unknown', email: 'unknown@example.com' };
          }
          
          // Transform image URLs to secure signed URLs
          const secureImages = updatedProperty.images ? await Promise.all(
            updatedProperty.images.map(async (imagePath: string) => {
              if (imagePath.startsWith('http')) {
                return imagePath;
              }
              return await getSecureImageUrl('property-images', imagePath) || imagePath;
            })
          ) : [];
          
          const enrichedProperty = {
            ...updatedProperty,
            images: secureImages,
            profiles: profileData
          };
          
          // Update local state
          setProperties(prev => 
            prev.map(p => p.id === enrichedProperty.id ? enrichedProperty : p)
          );
          
          // Dispatch event for cross-component sync
          window.dispatchEvent(new CustomEvent('properties:refresh'));
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'properties'
        }, () => {
          fetchProperties();
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'properties'
        }, () => {
          fetchProperties();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    properties,
    loading,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    uploadPropertyImage,
    addActivity,
  };
};