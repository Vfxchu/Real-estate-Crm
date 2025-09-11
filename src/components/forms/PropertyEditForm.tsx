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
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { Property } from "@/hooks/useProperties";
import { BEDROOM_OPTIONS, bedroomEnumToNumber, numberToBedroomEnum, BedroomEnum } from "@/constants/bedrooms";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";

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
  bathrooms: z.number().min(0).optional(),
  area_sqft: z.number().min(0).optional(),
  status: z.enum(['vacant', 'rented', 'in_development'], { required_error: "Status is required" }),
  permit_number: z.string().optional(),
  owner_contact_id: z.string().min(1, "Owner contact is required"),
  agent_id: z.string().optional(),
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
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);

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
      status: property.status === 'available' ? 'vacant' : property.status as any || 'vacant',
      permit_number: property.permit_number || '',
      owner_contact_id: property.owner_contact_id || '',
      agent_id: property.agent_id || user?.id || '',
    },
  });

  // Set existing images
  useEffect(() => {
    if (property.images && property.images.length > 0) {
      setUploadedImages(property.images);
    }
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadingFiles(true);
    const newFiles: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `${property.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store storage path instead of public URL for secure access
        newFiles.push(filePath);
      }
      
      setUploadedImages(prev => [...prev, ...newFiles]);
      
      toast({
        title: 'Images uploaded',
        description: `${newFiles.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Error uploading images',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = async (fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${property.id}/${fileName}`;
      
      await supabase.storage
        .from('property-images')
        .remove([filePath]);
      
      setUploadedImages(prev => prev.filter(url => url !== fileUrl));
      
      toast({
        title: 'Image removed',
        description: 'File has been removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error removing image',
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
        bathrooms: data.bathrooms ?? null,
        area_sqft: data.area_sqft ?? null,
        status: data.status,
        offer_type: data.offer_type,
        price: Number(data.price),
        description: data.description || null,
        permit_number: data.permit_number || null,
        owner_contact_id: data.owner_contact_id || null,
        agent_id: isAdmin && data.agent_id ? data.agent_id : user.id,
        images: uploadedImages.length > 0 ? uploadedImages : null,
      };

      // Update property
      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', property.id);

      if (error) {
        console.error('Update property error:', error);
        throw error;
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
        const { data } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .eq('role', 'agent')
          .eq('status', 'active');
          
        if (data) {
          setAgents(data.map(agent => ({ id: agent.user_id, name: agent.name, email: agent.email })));
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
                      step="0.5"
                      placeholder="Number of bathrooms" 
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
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="rented">Rented</SelectItem>
                      <SelectItem value="in_development">In Development</SelectItem>
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
                  <FormLabel>Owner Contact *</FormLabel>
                  <FormControl>
                    <SearchableContactCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select owner contact"
                    />
                  </FormControl>
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