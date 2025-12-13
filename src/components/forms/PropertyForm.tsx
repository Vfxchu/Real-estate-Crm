import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/services/storage";
import { validateFileUpload } from "@/lib/sanitizer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, Image as ImageIcon, FileText, LayoutDashboard, Plus } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { BEDROOM_OPTIONS, bedroomEnumToNumber, numberToBedroomEnum, BedroomEnum } from "@/constants/bedrooms";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { VIEW_OPTIONS } from "@/constants/property";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { useLocations } from "@/hooks/useLocations";

const propertySchema = z.object({
  title: z.string().min(1, "Property title is required"),
  segment: z.enum(['residential', 'commercial'], { required_error: "Property segment is required" }),
  subtype: z.string().min(1, "Property subtype is required"),
  offer_type: z.enum(['rent', 'sale'], { required_error: "Offer type is required" }),
  price: z.number().min(0, "Price must be greater than 0"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  address: z.string().min(1, "Address is required"),
  city: z.enum(['Dubai', 'Abu Dhabi', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain', 'Ajman', 'Fujairah'], { required_error: "City is required" }),
  unit_number: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.number().int("Bathrooms must be a whole number").min(0).optional(),
  area_sqft: z.number().min(0).optional(),
  plot_area_sqft: z.number().min(0).optional(),
  status: z.enum(['vacant', 'rented', 'in_development', 'not_available_sold', 'not_available_rented', 'off_market'], { required_error: "Status is required" }),
  permit_number: z.string().optional(),
  owner_contact_id: z.string().min(1, "Owner contact is required"),
  agent_id: z.string().optional(),
  view: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editProperty?: Property | null;
}

interface Property {
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
  offer_type: 'rent' | 'sale';
  featured?: boolean;
  images?: string[];
  agent_id: string;
  permit_number?: string;
  owner_contact_id?: string;
  location_place_id?: string;
  location_lat?: number;
  location_lng?: number;
  created_at: string;
  updated_at: string;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ open, onOpenChange, onSuccess, editProperty }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const contacts = useContacts();
  const { sessionHealthy } = useSessionMonitor();
  const { locations, addLocation } = useLocations();
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedLayouts, setUploadedLayouts] = useState<string[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [showInlineOwnerForm, setShowInlineOwnerForm] = useState(false);
  const [inlineOwnerData, setInlineOwnerData] = useState({ name: '', phone: '', email: '' });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  // Note: Location state managed by SearchableSelect component
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [creatingOwner, setCreatingOwner] = useState(false);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      segment: 'residential',
      subtype: '',
      offer_type: 'sale',
      price: 0,
      description: '',
      location: '',
      address: '',
      city: 'Dubai',
      unit_number: '',
      bedrooms: '',
      bathrooms: 1,
      area_sqft: 0,
      plot_area_sqft: 0,
      status: 'vacant',
      permit_number: '',
      owner_contact_id: '',
      agent_id: user?.id || '',
      view: '',
    },
  });

  // Validate session when form opens
  useEffect(() => {
    if (open && !user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create or edit properties',
        variant: 'destructive',
      });
      onOpenChange(false);
    }
  }, [open, user]);

  // Reset form when editProperty changes
  useEffect(() => {
    if (editProperty) {
      form.reset({
        title: editProperty.title || '',
        segment: editProperty.segment || 'residential',
        subtype: editProperty.subtype || '',
        offer_type: editProperty.offer_type || 'sale',
        price: editProperty.price || 0,
        description: editProperty.description || '',
        location: editProperty.address || '',
        address: editProperty.address || '',
        city: (editProperty.city as any) || 'Dubai',
        unit_number: editProperty.unit_number || '',
        bedrooms: editProperty ? numberToBedroomEnum(editProperty.bedrooms) : '',
        bathrooms: editProperty.bathrooms || 1,
        area_sqft: editProperty.area_sqft || 0,
        plot_area_sqft: 0,
        status: editProperty.status === 'available' ? 'vacant' : editProperty.status as any || 'vacant',
        permit_number: editProperty.permit_number || '',
        owner_contact_id: editProperty.owner_contact_id || '',
        agent_id: editProperty.agent_id || user?.id || '',
        view: (editProperty as any)?.view || '',
      });
      
      // Set existing images
      if (editProperty.images && editProperty.images.length > 0) {
        setUploadedImages(editProperty.images);
      }
    } else {
      form.reset({
        title: '',
        segment: 'residential',
        subtype: '',
        offer_type: 'sale',
        price: 0,
        description: '',
        location: '',
        address: '',
        city: 'Dubai',
        unit_number: '',
        bedrooms: '',
        bathrooms: 1,
        area_sqft: 0,
        plot_area_sqft: 0,
        status: 'vacant',
        permit_number: '',
        owner_contact_id: '',
        agent_id: user?.id || '',
        view: '',
      });
      setUploadedImages([]);
      setUploadedLayouts([]);
      setUploadedDocuments([]);
    }
  }, [editProperty, form, user?.id]);

  const watchSegment = form.watch('segment');

  const getSubtypeOptions = () => {
    if (watchSegment === 'residential') {
      return [
        { value: 'apartment', label: 'Apartment' },
        { value: 'townhouse', label: 'Townhouse' },
        { value: 'villa', label: 'Villa' },
        { value: 'plot', label: 'Plot' },
        { value: 'building', label: 'Building' },
        { value: 'penthouse', label: 'Penthouse' },
      ];
    } else {
      return [
        { value: 'office', label: 'Office' },
        { value: 'shop', label: 'Shop' },
        { value: 'villa', label: 'Villa' },
        { value: 'plot', label: 'Plot' },
        { value: 'building', label: 'Building' },
        { value: 'warehouse', label: 'Warehouse' },
      ];
    }
  };

  const handleFileUpload = async (files: FileList | null, type: 'images' | 'layouts' | 'documents') => {
    if (!files || files.length === 0) return;
    
    // Validate file types for documents
    if (type === 'documents') {
      const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
      const invalidFiles = Array.from(files).filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return !validExtensions.includes(ext);
      });
      
      if (invalidFiles.length > 0) {
        toast({
          title: 'Invalid file type',
          description: 'Only PDF, DOC, DOCX, and image files are allowed for documents.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    setUploadingFiles(true);
    const newFiles: string[] = [];
    
    const bucketMap = {
      images: 'property-images',
      layouts: 'property-layouts', 
      documents: 'property-docs'
    };
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `temp/${fileName}`;

        const uploadRes = await uploadFile(bucketMap[type], filePath, file);

        if (uploadRes.error) throw uploadRes.error;

        // For private buckets, we'll store the path and get signed URLs on read
        newFiles.push(uploadRes.path || filePath);
      }
      
      if (type === 'images') {
        setUploadedImages(prev => [...prev, ...newFiles]);
      } else if (type === 'layouts') {
        setUploadedLayouts(prev => [...prev, ...newFiles]);
      } else {
        setUploadedDocuments(prev => [...prev, ...newFiles]);
      }
      
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded`,
        description: `${newFiles.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error(`${type} upload error:`, error);
      toast({
        title: `Error uploading ${type}`,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = async (fileUrl: string, type: 'images' | 'layouts' | 'documents') => {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `temp/${fileName}`;
      
      const bucketMap = {
        images: 'property-images',
        layouts: 'property-layouts',
        documents: 'property-docs'
      };
      
      await supabase.storage
        .from(bucketMap[type])
        .remove([filePath]);
      
      if (type === 'images') {
        setUploadedImages(prev => prev.filter(url => url !== fileUrl));
      } else if (type === 'layouts') {
        setUploadedLayouts(prev => prev.filter(url => url !== fileUrl));
      } else {
        setUploadedDocuments(prev => prev.filter(url => url !== fileUrl));
      }
      
      toast({
        title: `${type.slice(0, -1)} removed`,
        description: 'File has been removed successfully',
      });
    } catch (error: any) {
      console.error(`Error removing ${type}:`, error);
      toast({
        title: `Error removing ${type}`,
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Helper function to move files
  const moveFiles = async (fileUrls: string[], propertyId: string, bucket: string, fileType: string) => {
    const movedFiles: string[] = [];
    
    for (const fileUrl of fileUrls) {
      try {
        const urlParts = fileUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const tempPath = `temp/${fileName}`;
        const propertyPath = `${propertyId}/${fileName}`;
        
        const { data: fileData } = await supabase.storage
          .from(bucket)
          .download(tempPath);
          
        if (fileData) {
          const { error: moveError } = await supabase.storage
            .from(bucket)
            .upload(propertyPath, fileData);
            
          if (!moveError) {
            await supabase.storage
              .from(bucket)
              .remove([tempPath]);
              
            // Store storage path (not public URL) so frontend can always sign when needed
            movedFiles.push(propertyPath);
          }
        }
      } catch (error) {
        console.error(`Error moving ${fileType}:`, error);
      }
    }
    
    return movedFiles;
  };

  const onSubmit = async (data: PropertyFormData) => {
    const submissionId = `prop-submit-${Date.now()}`;
    
    try {
      setLoading(true);
      
      // CRITICAL: Prevent submission if session is unhealthy
      if (!sessionHealthy) {
        toast({
          title: 'Session Expired',
          description: 'Please refresh the page before submitting.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      
      console.log(`[${submissionId}] Starting property submission`, {
        isEdit: !!editProperty,
        hasOwner: !!data.owner_contact_id,
        imageCount: uploadedImages.length,
        layoutCount: uploadedLayouts.length,
        documentCount: uploadedDocuments.length
      });

      // CRITICAL: Robust session validation - fetch fresh session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        console.error(`[${submissionId}] Session validation failed:`, sessionError);
        throw new Error('Your session has expired. Please refresh the page and try again.');
      }

      // Use session.user for guaranteed fresh data
      const currentUser = session.user;
      
      // Verify profile is loaded
      if (!profile) {
        throw new Error('User profile not loaded. Please refresh the page.');
      }

      console.log(`[${submissionId}] Session validated successfully`);

      // Validate owner contact exists
      if (data.owner_contact_id) {
        const { data: ownerExists, error: ownerCheckError } = await supabase
          .from('leads')
          .select('id')
          .eq('id', data.owner_contact_id)
          .maybeSingle();
        
        if (ownerCheckError) {
          console.error(`[${submissionId}] Error checking owner contact:`, ownerCheckError);
        }
        
        if (!ownerExists) {
          // Check contacts table as fallback
          const { data: ownerInContacts } = await supabase
            .from('contacts')
            .select('id')
            .eq('id', data.owner_contact_id)
            .maybeSingle();
          
          if (!ownerInContacts) {
            throw new Error('Selected owner contact does not exist. Please refresh and try again.');
          }
        }
      }

      // Check if admin for agent assignment
      const isAdmin = profile?.role === 'admin';
      
      // Prepare payload
      const payload = {
        title: data.title,
        segment: data.segment,
        subtype: data.subtype,
        property_type: data.subtype,
        address: data.address,
        city: data.city,
        state: 'UAE',
        zip_code: null,
        unit_number: data.unit_number || null,
        bedrooms: data.bedrooms ? bedroomEnumToNumber(data.bedrooms as BedroomEnum) : null,
        bathrooms: data.bathrooms ?? null,
        area_sqft: data.area_sqft ?? null,
        status: data.status,
        offer_type: data.offer_type,
        price: Number(data.price),
        description: data.description || null,
        permit_number: data.permit_number || null,
        owner_contact_id: data.owner_contact_id || null,
        agent_id: isAdmin && data.agent_id ? data.agent_id : (currentUser?.id || user?.id || ''),
        images: uploadedImages.length > 0 ? uploadedImages : null,
        view: data.view || null,
      };

      let propertyData;

      if (editProperty) {
        // Update existing property
        const { data: updatedData, error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', editProperty.id)
          .select('*')
          .single();

        if (error) {
          console.error('Update property error:', error);
          throw error;
        }
        propertyData = updatedData;
      } else {
        // Create new property
        const { data: newData, error } = await supabase
          .from('properties')
          .insert([payload])
          .select('*')
          .single();

        if (error) {
          console.error(`[${submissionId}] Create property error:`, error);
          throw error;
        }
        propertyData = newData;
      }

      console.log(`[${submissionId}] Property created/updated:`, propertyData.id);

      // Move all files and update contact records
      if (propertyData) {
        // Auto-assign Seller/Landlord tags based on all properties owned
        if (data.owner_contact_id) {
          try {
            const { syncOwnerTagsFromProperties } = await import('@/services/property-automation');
            const syncResult = await syncOwnerTagsFromProperties(data.owner_contact_id);
            
            if (!syncResult.success) {
              console.warn(`[${submissionId}] Failed to sync owner tags:`, syncResult.error);
              toast({
                title: 'Warning',
                description: 'Property created but owner tags may not be updated. You can manually refresh contact data.',
                variant: 'default'
              });
            } else {
              console.log(`[${submissionId}] Successfully synced Seller/Landlord tags`);
            }
          } catch (syncError) {
            console.error(`[${submissionId}] Critical error in syncOwnerTagsFromProperties:`, syncError);
            // Don't fail the entire operation - property was created successfully
            toast({
              title: 'Partial Success',
              description: 'Property created successfully, but automatic tag assignment failed. Please update contact tags manually.',
              variant: 'default'
            });
          }
          
          // Link property to contact in contact_properties table
          try {
            // Use upsert to prevent duplicate key errors
            const { error: linkError } = await supabase
              .from('contact_properties')
              .upsert({
                contact_id: data.owner_contact_id,
                property_id: propertyData.id,
                role: 'owner'
              }, {
                onConflict: 'contact_id,property_id,role',
                ignoreDuplicates: false
              });
            
            if (linkError) {
              console.error(`[${submissionId}] Failed to link property to contact:`, linkError);
              // Log but don't fail - property was created successfully
              toast({
                title: 'Warning',
                description: 'Property created but contact linkage may be incomplete.',
                variant: 'default'
              });
            }
          } catch (linkError) {
            console.error(`[${submissionId}] Critical error linking property to contact:`, linkError);
          }
        }

        // Move images first and update the property with storage paths
        try {
          let movedImagePaths: string[] = [];
          if (uploadedImages.length > 0) {
            movedImagePaths = await moveFiles(uploadedImages, propertyData.id, 'property-images', 'image');
            if (movedImagePaths.length > 0) {
              await supabase
                .from('properties')
                .update({ images: movedImagePaths })
                .eq('id', propertyData.id);
            }
          }
        } catch (imageError) {
          console.error('Error processing images:', imageError);
          toast({
            title: 'Warning',
            description: 'Some images may not have been uploaded correctly',
            variant: 'destructive'
          });
        }

        // Move layouts
        try {
          if (uploadedLayouts.length > 0) {
            await moveFiles(uploadedLayouts, propertyData.id, 'property-layouts', 'layout');
          }
        } catch (layoutError) {
          console.error('Error processing layouts:', layoutError);
        }

        // Move documents and create proper database records
        try {
          if (uploadedDocuments.length > 0) {
            const movedDocs = await moveFiles(uploadedDocuments, propertyData.id, 'property-docs', 'document');
            
            // Create records in property_files table
            for (const docPath of movedDocs) {
              try {
                const pathParts = docPath.split('/');
                const fileName = pathParts[pathParts.length - 1];
                const timestampIndex = fileName.indexOf('_');
                const originalName = timestampIndex > 0 ? fileName.substring(timestampIndex + 1) : fileName;
                
                // Get file size from storage
                let fileSize = 0;
                try {
                  const { data: fileData } = await supabase.storage
                    .from('property-docs')
                    .download(docPath);
                  if (fileData) {
                    fileSize = fileData.size;
                  }
                } catch (sizeError) {
                  console.error('Could not get file size:', sizeError);
                }
                
                // Insert into property_files table
                const { error: propertyFileError } = await supabase
                  .from('property_files')
                  .insert({
                    property_id: propertyData.id,
                    name: originalName,
                    path: docPath,
                    type: 'document',
                    size: fileSize,
                    created_by: currentUser?.id || user?.id || session?.user?.id
                  });
                
                if (propertyFileError) {
                  console.error('Error creating property_files record:', propertyFileError);
                }
                
                // Also insert into contact_files for contact association
                if (data.owner_contact_id) {
                  const { error: contactFileError } = await supabase
                    .from('contact_files')
                    .insert({
                      contact_id: data.owner_contact_id,
                      source: 'property',
                      property_id: propertyData.id,
                      path: docPath,
                      name: originalName,
                      type: 'document',
                      created_by: currentUser?.id || user?.id || session?.user?.id
                    });
                  
                  if (contactFileError) {
                    console.error('Error creating contact_files record:', contactFileError);
                  }
                }
              } catch (docError) {
                console.error('Error creating document record:', docError);
                // Continue with other documents even if one fails
              }
            }
          }
        } catch (docError) {
          console.error(`[${submissionId}] Error processing documents:`, docError);
          toast({
            title: 'Warning',
            description: 'Some documents may not have been uploaded correctly',
            variant: 'destructive'
          });
        }
      }

      console.log(`[${submissionId}] File operations completed`);

      // Verify property was created/updated correctly
      try {
        const { data: verifyProperty, error: verifyError } = await supabase
          .from('properties')
          .select('id, title, owner_contact_id')
          .eq('id', propertyData.id)
          .single();
        
        if (verifyError || !verifyProperty) {
          throw new Error('Property verification failed - data may not be saved correctly');
        }
        
        console.log(`[${submissionId}] Property verification successful:`, verifyProperty);
      } catch (verifyError) {
        console.error(`[${submissionId}] Property verification failed:`, verifyError);
        toast({
          title: 'Warning',
          description: 'Property may not have been saved correctly. Please verify in the properties list.',
          variant: 'destructive'
        });
      }

      toast({
        title: editProperty ? 'Property updated successfully' : 'Property created successfully',
        description: editProperty ? 'Property has been updated.' : 'New property has been added to your listings.',
      });

      console.log(`[${submissionId}] Submission successful - closing form`);

      // Dispatch events for real-time sync across the app
      window.dispatchEvent(new CustomEvent('properties:refresh'));
      window.dispatchEvent(new CustomEvent('properties:updated'));
      if (data.owner_contact_id) {
        window.dispatchEvent(new CustomEvent('contacts:updated'));
      }

      form.reset();
      setUploadedImages([]);
      setUploadedLayouts([]);
      setUploadedDocuments([]);
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error(`[${submissionId}] Property form submission error:`, {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        timestamp: new Date().toISOString(),
        hasUser: !!user,
        hasProfile: !!profile,
        sessionCheck: !!(await supabase.auth.getSession()).data.session
      });
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let errorTitle = editProperty ? 'Error updating property' : 'Error creating property';
      
      // Session/Auth errors
      if (error.message?.includes('session') || error.message?.includes('sign in') || error.message?.includes('expired')) {
        errorTitle = 'Session Expired';
        errorMessage = 'Your login session has expired. Please refresh the page and try again.';
      }
      // RLS/Permission errors
      else if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorTitle = 'Permission Denied';
        errorMessage = 'You do not have permission to perform this action. Contact your administrator.';
      }
      // Network errors
      else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorTitle = 'Connection Error';
        errorMessage = 'Network connection failed. Please check your internet and try again.';
      }
      // Validation errors
      else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load contacts and agents
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const { data } = await contacts.list({ q: '', page: 1, pageSize: 1000 });
        setContactsList(data || []);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };

    const loadAgents = async () => {
      if (profile?.role === 'admin') {
        // Fetch agent user IDs from user_roles table
        const { data: agentRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'agent');

        const agentUserIds = agentRoles?.map(r => r.user_id) || [];

        if (agentUserIds.length > 0) {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', agentUserIds)
            .eq('status', 'active');
          
          if (data) {
            setAgents(data.map(agent => ({ id: agent.user_id, name: agent.name, email: agent.email })));
          }
        }
      }
    };

    loadContacts();
    loadAgents();
  }, [profile?.role, contacts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">{editProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
          <DialogDescription className="sr-only">{editProperty ? 'Edit property dialog' : 'Add property dialog'}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Property Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter property title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('subtype', ''); // Reset subtype when segment changes
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtype *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subtype" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getSubtypeOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="offer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select offer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sale">Sale</SelectItem>
                          <SelectItem value="rent">Rent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (AED) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            AED
                          </span>
                          <Input 
                            type="number" 
                            placeholder="Enter price in AED" 
                            className="pl-12"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter property description..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={locations.map((loc) => ({ value: loc.name, label: loc.name }))}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select location..."
                          searchPlaceholder="Search locations..."
                          emptyMessage="No locations found."
                          allowAddNew={true}
                          onAddNew={async (name) => {
                            const newLoc = await addLocation(name);
                            if (newLoc) {
                              toast({
                                title: 'Location added',
                                description: `"${newLoc.name}" has been added to locations`,
                              });
                              return { value: newLoc.name, label: newLoc.name };
                            }
                            return null;
                          }}
                          addNewLabel="Add New Location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter full address details..." 
                          rows={3} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={[
                            { value: 'Dubai', label: 'Dubai' },
                            { value: 'Abu Dhabi', label: 'Abu Dhabi' },
                            { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
                            { value: 'Sharjah', label: 'Sharjah' },
                            { value: 'Umm Al Quwain', label: 'Umm Al Quwain' },
                            { value: 'Ajman', label: 'Ajman' },
                            { value: 'Fujairah', label: 'Fujairah' },
                          ]}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select city..."
                          searchPlaceholder="Search cities..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1A, 2304, Villa 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bedrooms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BEDROOM_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="1"
                          placeholder="Number of bathrooms" 
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(isNaN(value) ? undefined : value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area_sqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Built-up Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="Enter area in sqft" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plot_area_sqft"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plot Area (sq ft)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="Enter area in sqft" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* View Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="view"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>View</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select view type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VIEW_OPTIONS.map((view) => (
                          <SelectItem key={view.value} value={view.value}>
                            {view.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Active Statuses */}
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                          <SelectItem value="in_development">In Development</SelectItem>
                          {/* Separator */}
                          <div className="my-1 border-t border-border" />
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Inactive / Off Market</div>
                          <SelectItem value="not_available_sold">Not Available (Sold)</SelectItem>
                          <SelectItem value="not_available_rented">Not Available (Rented)</SelectItem>
                          <SelectItem value="off_market">Off Market</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Permit Number hidden for now */}
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="owner_contact_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel>Owner Contact *</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddOwner(!showAddOwner);
                            if (!showAddOwner) {
                              setNewOwnerName('');
                              setNewOwnerPhone('');
                              setNewOwnerEmail('');
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {showAddOwner ? 'Cancel' : 'Add New Owner'}
                        </Button>
                      </div>
                      
                      {showAddOwner && (
                        <div className="mb-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                          <p className="text-sm text-muted-foreground">Create a new owner contact</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium">Full Name *</label>
                              <Input
                                value={newOwnerName}
                                onChange={(e) => setNewOwnerName(e.target.value)}
                                placeholder="Enter full name"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Phone</label>
                              <Input
                                value={newOwnerPhone}
                                onChange={(e) => setNewOwnerPhone(e.target.value)}
                                placeholder="Enter phone number"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Email</label>
                              <Input
                                type="email"
                                value={newOwnerEmail}
                                onChange={(e) => setNewOwnerEmail(e.target.value)}
                                placeholder="Enter email"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!newOwnerName.trim() || creatingOwner}
                            onClick={async () => {
                              if (!newOwnerName.trim()) {
                                toast({
                                  title: 'Name required',
                                  description: 'Please enter the owner name',
                                  variant: 'destructive'
                                });
                                return;
                              }
                              
                              try {
                                setCreatingOwner(true);
                                const { data: userData } = await supabase.auth.getUser();
                                if (!userData.user) throw new Error('Not authenticated');
                                
                                let contactToUse = null;
                                
                                // Check if a contact with this email already exists (if email provided)
                                if (newOwnerEmail.trim()) {
                                  const { data: existingContact } = await supabase
                                    .from('contacts')
                                    .select('id, full_name')
                                    .eq('email', newOwnerEmail.trim())
                                    .maybeSingle();
                                  
                                  if (existingContact) {
                                    contactToUse = existingContact;
                                    toast({
                                      title: 'Existing contact found',
                                      description: `Using existing contact: ${existingContact.full_name}`
                                    });
                                  }
                                }
                                
                                // Create new contact if no existing one found
                                if (!contactToUse) {
                                  const { data: newContact, error: contactError } = await supabase
                                    .from('contacts')
                                    .insert({
                                      full_name: newOwnerName.trim(),
                                      phone: newOwnerPhone.trim() || null,
                                      email: newOwnerEmail.trim() || null,
                                      status_mode: 'auto',
                                      status_effective: 'active',
                                      created_by: userData.user.id
                                    })
                                    .select()
                                    .single();
                                  
                                  if (contactError) throw contactError;
                                  contactToUse = newContact;
                                  
                                  toast({
                                    title: 'Owner created',
                                    description: `${newOwnerName} has been added as a contact`
                                  });
                                }
                                
                                // Set as owner
                                field.onChange(contactToUse.id);
                                
                                // Dispatch event to refresh contacts list
                                window.dispatchEvent(new CustomEvent('contacts:updated'));
                                
                                // Reset and hide form
                                setNewOwnerName('');
                                setNewOwnerPhone('');
                                setNewOwnerEmail('');
                                setShowAddOwner(false);
                              } catch (error: any) {
                                toast({
                                  title: 'Error creating owner',
                                  description: error.message,
                                  variant: 'destructive'
                                });
                              } finally {
                                setCreatingOwner(false);
                              }
                            }}
                          >
                            {creatingOwner ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create & Select Owner'
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {!showAddOwner && (
                        <FormControl>
                          <SearchableContactCombobox
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select owner contact"
                          />
                        </FormControl>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {profile?.role === 'admin' && (
                  <FormField
                    control={form.control}
                    name="agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Agent</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name} ({agent.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* File Uploads */}
            <div className="space-y-6">
              {/* Property Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Property Images</h3>
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center bg-muted/10">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop property images
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 'images')}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingFiles}
                  >
                    {uploadingFiles ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Images
                      </>
                    )}
                  </Button>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Property image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(imageUrl, 'images')}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Floor Plan & Layout */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Floor Plan & Layout</h3>
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center bg-muted/10">
                  <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload floor plans and layout diagrams
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP, PDF up to 10MB each
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => handleFileUpload(e.target.files, 'layouts')}
                    className="hidden"
                    id="layout-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => document.getElementById('layout-upload')?.click()}
                    disabled={uploadingFiles}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Floor Plans
                  </Button>
                </div>

                {uploadedLayouts.length > 0 && (
                  <div className="space-y-2">
                    {uploadedLayouts.map((layoutUrl, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Floor Plan {index + 1}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(layoutUrl, 'layouts')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Property Documents</h3>
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center bg-muted/10">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload contracts, deeds, and other documents
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX up to 10MB each
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 'documents')}
                    className="hidden"
                    id="document-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => document.getElementById('document-upload')?.click()}
                    disabled={uploadingFiles}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Documents
                  </Button>
                </div>

                {uploadedDocuments.length > 0 && (
                  <div className="space-y-2">
                    {uploadedDocuments.map((docUrl, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Document {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(docUrl, 'documents')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading 
                  ? (editProperty ? 'Updating...' : 'Creating...') 
                  : (editProperty ? 'Update Property' : 'Create Property')
                }
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};