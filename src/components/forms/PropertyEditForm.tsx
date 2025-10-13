import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, Image as ImageIcon, LayoutDashboard, FileText } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { Property } from "@/hooks/useProperties";
import { BEDROOM_OPTIONS, bedroomEnumToNumber, numberToBedroomEnum, BedroomEnum } from "@/constants/bedrooms";
import { PROPERTY_SEGMENTS, getSubtypeOptions, OFFER_TYPES, PROPERTY_STATUS, VIEW_OPTIONS } from "@/constants/property";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";
import { PropertyFilesSection } from "@/components/properties/PropertyFilesSection";

const propertySchema = z.object({
  title: z.string().min(1, "Property title is required"),
  segment: z.enum(['residential', 'commercial'], { required_error: "Property segment is required" }),
  subtype: z.string().min(1, "Property subtype is required"),
  offer_type: z.enum(['rent', 'sale'], { required_error: "Offer type is required" }),
  price: z.number().min(0, "Price must be greater than 0"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.enum(['Dubai', 'Abu Dhabi', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain', 'Ajman', 'Fujairah'], { required_error: "City is required" }),
  unit_number: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.number().int("Bathrooms must be a whole number").min(0).optional(),
  area_sqft: z.number().min(0).optional(),
  status: z.enum(['available', 'vacant', 'rented', 'in_development', 'sold', 'pending', 'off_market'], { required_error: "Status is required" }),
  permit_number: z.string().optional(),
  owner_contact_id: z.string().min(1, "Owner contact is required"),
  agent_id: z.string().optional(),
  view: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyEditFormProps {
  property: Property;
  onSuccess?: () => void;
}

export const PropertyEditForm: React.FC<PropertyEditFormProps> = ({ property, onSuccess }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const contacts = useContacts();
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedLayouts, setUploadedLayouts] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  
  // Owner creation state
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [creatingOwner, setCreatingOwner] = useState(false);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: property.title || '',
      segment: (property.segment as any) || 'residential',
      subtype: property.subtype || '',
      offer_type: (property.offer_type as any) || 'sale',
      price: property.price || 0,
      description: property.description || '',
      address: property.address || '',
      city: (property.city as any) || 'Dubai',
      unit_number: property.unit_number || '',
      bedrooms: property ? numberToBedroomEnum(property.bedrooms) : '',
      bathrooms: property.bathrooms || 0,
      area_sqft: property.area_sqft || 0,
      status: (property.status as any) || 'vacant',
      permit_number: property.permit_number || '',
      owner_contact_id: property.owner_contact_id || '',
      agent_id: property.agent_id || user?.id || '',
      view: property.view || '',
    },
  });

  // Set existing images and load layouts
  useEffect(() => {
    if (property.images && property.images.length > 0) {
      setUploadedImages(property.images);
    }
    
    // Load existing layouts from property_files table
    const loadLayouts = async () => {
      try {
        const { data, error } = await supabase
          .from('property_files')
          .select('path')
          .eq('property_id', property.id)
          .eq('type', 'layout');
        
        if (!error && data) {
          setUploadedLayouts(data.map(f => f.path));
        }
      } catch (error) {
        console.error('Error loading layouts:', error);
      }
    };
    
    loadLayouts();
  }, [property]);

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

  const handleFileUpload = async (files: FileList | null, type: 'images' | 'layouts' = 'images') => {
    if (!files || files.length === 0) return;
    
    // Validate file types
    const validTypes = type === 'images' 
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    const invalidFiles = Array.from(files).filter(
      file => !validTypes.includes(file.type)
    );
    
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: type === 'images' 
          ? 'Only JPG, PNG, and WEBP images are allowed.'
          : 'Only JPG, PNG, WEBP images and PDF files are allowed.',
        variant: 'destructive'
      });
      return;
    }
    
    setUploadingFiles(true);
    const newFiles: string[] = [];
    
    const bucket = type === 'images' ? 'property-images' : 'property-layouts';
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `${property.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store storage path
        newFiles.push(filePath);
        
        // Create record in property_files table for layouts
        if (type === 'layouts') {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('property_files').insert({
            property_id: property.id,
            name: file.name,
            path: filePath,
            type: 'layout',
            size: file.size,
            created_by: user?.id
          });
        }
      }
      
      if (type === 'images') {
        setUploadedImages(prev => [...prev, ...newFiles]);
      } else {
        setUploadedLayouts(prev => [...prev, ...newFiles]);
      }
      
      toast({
        title: `${type === 'images' ? 'Images' : 'Floor plans'} uploaded`,
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

  const removeFile = async (fileUrl: string, type: 'images' | 'layouts' = 'images') => {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${property.id}/${fileName}`;
      
      const bucket = type === 'images' ? 'property-images' : 'property-layouts';
      
      await supabase.storage
        .from(bucket)
        .remove([filePath]);
      
      // Delete from property_files table if layout
      if (type === 'layouts') {
        await supabase
          .from('property_files')
          .delete()
          .eq('property_id', property.id)
          .eq('path', filePath)
          .eq('type', 'layout');
      }
      
      if (type === 'images') {
        setUploadedImages(prev => prev.filter(url => url !== fileUrl));
      } else {
        setUploadedLayouts(prev => prev.filter(url => url !== fileUrl));
      }
      
      toast({
        title: `${type === 'images' ? 'Image' : 'Floor plan'} removed`,
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

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Please sign in to continue');
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
        bathrooms: data.bathrooms ? Math.floor(data.bathrooms) : null,
        area_sqft: data.area_sqft ?? null,
        status: data.status,
        offer_type: data.offer_type,
        price: Number(data.price),
        description: data.description || null,
        permit_number: data.permit_number || null,
        owner_contact_id: data.owner_contact_id || null,
        agent_id: isAdmin && data.agent_id ? data.agent_id : user.id,
        images: uploadedImages.length > 0 ? uploadedImages : null,
        view: data.view || null,
      };

      // Update property
      const { data: updatedProperty, error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', property.id)
        .select('*')
        .single();

      if (error) {
        console.error('Update property error:', error);
        
        // Log error to activities
        await supabase.from('activities').insert({
          type: 'error',
          description: `Error updating property: ${error.message} (Code: ${error.code || 'unknown'})`,
          property_id: property.id,
          created_by: user.id
        });
        
        throw error;
      }

      // Auto-assign seller/landlord tag to owner if changed
      if (payload.owner_contact_id && payload.offer_type) {
        const { ensureOwnerTag } = await import('@/services/property-automation');
        await ensureOwnerTag(payload.owner_contact_id, payload.offer_type);
      }

      toast({
        title: 'Property updated successfully',
        description: 'Property has been updated.',
      });

      onSuccess?.();

    } catch (error: any) {
      console.error('Property update error:', error);
      
      let errorMessage = error.message || 'Please check all required fields and try again.';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only update properties assigned to yourself.';
      }
      
      toast({
        title: 'Error updating property',
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
                  }} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Dubai">Dubai</SelectItem>
                      <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                      <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                      <SelectItem value="Sharjah">Sharjah</SelectItem>
                      <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                      <SelectItem value="Ajman">Ajman</SelectItem>
                      <SelectItem value="Fujairah">Fujairah</SelectItem>
                    </SelectContent>
                  </Select>
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
                      onChange={(e) => field.onChange(Math.floor(Number(e.target.value)))}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="rented">Rented</SelectItem>
                      <SelectItem value="in_development">In Development</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="off_market">Off Market</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="view"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>View</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)} value={field.value || '__none__'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No View Selected</SelectItem>
                      {VIEW_OPTIONS.map((option) => (
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
          </div>

          <FormField
            control={form.control}
            name="permit_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permit Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter permit number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="owner_contact_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Owner Contact *</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddOwner(!showAddOwner)}
                      className="text-xs"
                    >
                      {showAddOwner ? 'Select Existing' : '+ Quick Add Owner'}
                    </Button>
                  </div>
                  
                  {showAddOwner && (
                    <div className="space-y-3 mb-3 p-4 border rounded-lg bg-muted/10">
                      <Input
                        placeholder="Owner Name *"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                      />
                      <Input
                        placeholder="Phone (optional)"
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                      />
                      <Input
                        type="email"
                        placeholder="Email (optional)"
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                      />
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
                            
                            // Check if a contact with this email already exists
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
                            
                            // Set as owner immediately in both field and form
                            field.onChange(contactToUse.id);
                            form.setValue('owner_contact_id', contactToUse.id);
                            
                            // Reset and hide form
                            setNewOwnerName('');
                            setNewOwnerPhone('');
                            setNewOwnerEmail('');
                            setShowAddOwner(false);
                            
                            // Dispatch event after short delay to ensure DB commit
                            await new Promise(resolve => setTimeout(resolve, 150));
                            window.dispatchEvent(new CustomEvent('contacts:updated'));
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

            {profile?.role === 'admin' && agents.length > 0 && (
              <FormField
                control={form.control}
                name="agent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Agent</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || user?.id}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={agents.length === 0 ? "Loading agents..." : "Select agent"} />
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
                onChange={(e) => handleFileUpload(e.target.files)}
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
                      onClick={() => removeFile(imageUrl)}
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
                {uploadingFiles ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Floor Plans
                  </>
                )}
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

          {/* Documents Section */}
          <PropertyFilesSection propertyId={property.id} canEdit={true} />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-6">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Updating...' : 'Update Property'}
          </Button>
        </div>
      </form>
    </Form>
  );
};