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
  created_by?: string | null;
  profiles?: {
    name: string;
    email: string;
  };
  assigned_agent?: {
    name: string;
    email: string;
  };
  creator_profile?: {
    name: string;
    email: string;
    is_admin: boolean;
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
        .select('*, created_by')
        .order('created_at', { ascending: false});

      if (error) throw error;

      console.log('[PROPERTIES] Query result:', { data: data?.length || 0 });

      // Collect all unique user IDs (agent_id + created_by)
      const userIds = new Set<string>();
      (data || []).forEach(property => {
        if (property.agent_id) userIds.add(property.agent_id);
        if (property.created_by) userIds.add(property.created_by);
      });

      // Fetch user public info (names and admin status) via RPC
      const { data: publicUsers } = await supabase.rpc('get_user_public_info', {
        user_ids: Array.from(userIds)
      });

      // Build map of user_id -> { name, is_admin }
      const userMap = new Map(
        (publicUsers || []).map(u => [u.user_id, { name: u.name, is_admin: u.is_admin }])
      );

      // Process properties with profiles
      const propertiesWithProfiles = await Promise.all(
        (data || []).map(async (property) => {
          const assignedUser = property.agent_id ? userMap.get(property.agent_id) : null;
          const creatorUser = property.created_by ? userMap.get(property.created_by) : null;

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
            profiles: assignedUser ? { name: assignedUser.name, email: '' } : { name: 'Unassigned', email: '' },
            assigned_agent: assignedUser ? { name: assignedUser.name, email: assignedUser.name } : null,
            creator_profile: creatorUser ? {
              name: creatorUser.name,
              email: creatorUser.name,
              is_admin: creatorUser.is_admin
            } : null
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

  const createProperty = async (propertyData: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'assigned_agent' | 'creator_profile'>) => {
    try {
      console.log('[PROPERTIES] Creating property:', propertyData);
      // Direct insert with created_by
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          ...propertyData,
          created_by: user?.id
        }])
        .select('*, created_by')
        .single();

      if (error) throw error;

      // Fetch the profile data separately if the property has an agent_id
      let propertyWithProfile = data;
      if (data?.agent_id || data?.created_by) {
        const userIds = [];
        if (data.agent_id) userIds.push(data.agent_id);
        if (data.created_by) userIds.push(data.created_by);

        const { data: publicUsers } = await supabase.rpc('get_user_public_info', {
          user_ids: userIds
        });

        const userMap = new Map(
          (publicUsers || []).map(u => [u.user_id, { name: u.name, is_admin: u.is_admin }])
        );

        const assignedUser = data.agent_id ? userMap.get(data.agent_id) : null;
        const creatorUser = data.created_by ? userMap.get(data.created_by) : null;

        propertyWithProfile = {
          ...data,
          profiles: assignedUser ? { name: assignedUser.name, email: assignedUser.name } : { name: 'Unassigned', email: '' },
          assigned_agent: assignedUser ? { name: assignedUser.name, email: assignedUser.name } : null,
          creator_profile: creatorUser ? {
            name: creatorUser.name,
            email: creatorUser.name,
            is_admin: creatorUser.is_admin
          } : null
        } as any;
      }

      console.log('[PROPERTIES] Property created successfully');
      // Add to state immediately for instant UI update
      setProperties(prev => [propertyWithProfile as Property, ...prev]);
      
      toast({
        title: 'Property created successfully',
        description: 'New property has been added to your listings.',
      });

      // Dispatch event for cross-component sync
      window.dispatchEvent(new CustomEvent('properties:refresh'));

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

      // Dispatch event for cross-component sync
      window.dispatchEvent(new CustomEvent('properties:refresh'));

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
      // First delete property files from storage and database
      const { data: propertyFiles } = await supabase
        .from('property_files')
        .select('path')
        .eq('property_id', id);

      if (propertyFiles && propertyFiles.length > 0) {
        const filePaths = propertyFiles.map(file => file.path);
        await supabase.storage
          .from('property-docs')
          .remove(filePaths);
      }

      // Then delete associated images from storage
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

      // Delete the property (CASCADE will handle property_files table records)
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
          
          // Fetch user info for agent and creator
          const userIds = [];
          if (updatedProperty.agent_id) userIds.push(updatedProperty.agent_id);
          if (updatedProperty.created_by) userIds.push(updatedProperty.created_by);

          const { data: publicUsers } = await supabase.rpc('get_user_public_info', {
            user_ids: userIds
          });

          const userMap = new Map(
            (publicUsers || []).map(u => [u.user_id, { name: u.name, is_admin: u.is_admin }])
          );

          const assignedUser = updatedProperty.agent_id ? userMap.get(updatedProperty.agent_id) : null;
          const creatorUser = updatedProperty.created_by ? userMap.get(updatedProperty.created_by) : null;
          
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
            profiles: assignedUser ? { name: assignedUser.name, email: assignedUser.name } : { name: 'Unassigned', email: '' },
            assigned_agent: assignedUser ? { name: assignedUser.name, email: assignedUser.name } : null,
            creator_profile: creatorUser ? {
              name: creatorUser.name,
              email: creatorUser.name,
              is_admin: creatorUser.is_admin
            } : null
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