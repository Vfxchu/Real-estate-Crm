import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";

const propertySchema = z.object({
  title: z.string().min(1, "Property title is required"),
  segment: z.enum(['residential', 'commercial'], { required_error: "Property segment is required" }),
  subtype: z.string().min(1, "Property subtype is required"),
  property_type: z.string().min(1, "Property type is required"),
  offer_type: z.enum(['rent', 'sale'], { required_error: "Offer type is required" }),
  price: z.number().min(0, "Price must be greater than 0"),
  description: z.string().optional(),
  location: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  unit_number: z.string().optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  area_sqft: z.number().min(0).optional(),
  plot_area_sqft: z.number().min(0).optional(),
  status: z.enum(['available', 'pending', 'sold', 'off_market', 'vacant', 'rented', 'in_development'], { required_error: "Status is required" }),
  permit_number: z.string().optional(),
  owner_contact_id: z.string().min(1, "Owner contact is required"),
  agent_id: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FileUpload {
  file: File;
  preview?: string;
  type: 'image' | 'layout' | 'document';
  progress?: number;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ open, onOpenChange, onSuccess }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { leads } = useLeads();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const layoutInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      segment: 'residential',
      subtype: '',
      property_type: '',
      offer_type: 'sale',
      price: 0,
      description: '',
      location: '',
      address: '',
      city: '',
      unit_number: '',
      bedrooms: 0,
      bathrooms: 0,
      area_sqft: 0,
      plot_area_sqft: 0,
      status: 'available',
      permit_number: '',
      owner_contact_id: '',
      agent_id: user?.id || '',
    },
  });

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

  const handleFileUpload = useCallback(async (files: FileList, type: 'image' | 'layout' | 'document') => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedMimes = {
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      layout: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };

    const validFiles: FileUpload[] = [];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 20MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      if (!allowedMimes[type].includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported ${type} file`,
          variant: 'destructive',
        });
        continue;
      }

      const fileUpload: FileUpload = { file, type };

      if (type === 'image' || (type === 'layout' && file.type.startsWith('image/'))) {
        fileUpload.preview = URL.createObjectURL(file);
      }

      validFiles.push(fileUpload);
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const removedFile = prev[index];
      if (removedFile.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  }, []);

  const uploadFileToStorage = async (file: File, type: 'image' | 'layout' | 'document', propertyId: string) => {
    const bucket = type === 'image' ? 'property-images' : type === 'layout' ? 'property-layouts' : 'property-docs';
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${propertyId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { path: filePath, url: publicUrl, name: file.name, size: file.size };
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
      
      // Prepare payload for direct insert
      const payload = {
        title: data.title,
        segment: data.segment.toLowerCase(),
        subtype: data.subtype,
        property_type: data.subtype, // Use subtype as property_type
        address: data.address,
        city: data.city,
        state: 'UAE', // All UAE properties
        zip_code: null, // Not using zip codes
        unit_number: data.unit_number || null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        area_sqft: data.area_sqft ?? null,
        status: data.status.toLowerCase(),
        offer_type: data.offer_type.toLowerCase(),
        price: Number(data.price),
        description: data.description || null,
        permit_number: data.permit_number || null,
        owner_contact_id: data.owner_contact_id || null,
        agent_id: isAdmin && data.agent_id ? data.agent_id : user.id,
      };

      // Direct insert to properties table
      const { data: propertyData, error } = await supabase
        .from('properties')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        console.error('Create property error:', error);
        throw error;
      }

      toast({
        title: 'Property created successfully',
        description: 'New property has been added to your listings.',
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Property creation error:', error);
      
      let errorMessage = error.message || 'Please check all required fields and try again.';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only create properties assigned to yourself.';
      }
      
      toast({
        title: 'Error creating property',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter leads/contacts for owner selection
  const contactOptions = leads.filter(lead => lead.name && lead.email);

  // Get agents for admin selection
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);

  React.useEffect(() => {
    if (profile?.role === 'admin') {
      supabase
        .from('profiles')
        .select('user_id, name, email')
        .eq('role', 'agent')
        .eq('status', 'active')
        .then(({ data }) => {
          if (data) {
            setAgents(data.map(agent => ({ id: agent.user_id, name: agent.name, email: agent.email })));
          }
        });
    }
  }, [profile?.role]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
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
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter general location/area" {...field} />
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
                        <Textarea placeholder="Enter street address" rows={2} {...field} />
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
                        <Input placeholder="Enter unit number" {...field} />
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
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="Number of bedrooms" 
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
                      <FormLabel>Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="Area in square feet" 
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
                          placeholder="Plot area in square feet" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
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
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="off_market">Off Market</SelectItem>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                          <SelectItem value="in_development">In Development</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select owner contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contactOptions.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name} ({contact.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Files & Documents</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Images */}
                <div>
                  <Label>Property Images</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Upload Images
                  </Button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'image')}
                    className="hidden"
                  />
                </div>

                {/* Layout */}
                <div>
                  <Label>Property Layout</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => layoutInputRef.current?.click()}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Layout
                  </Button>
                  <input
                    ref={layoutInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'layout')}
                    className="hidden"
                  />
                </div>

                {/* Documents */}
                <div>
                  <Label>Documents</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => documentInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                  <input
                    ref={documentInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'document')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Previews */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uploadedFiles.map((fileUpload, index) => (
                      <div key={index} className="relative group border rounded-lg p-3 bg-card">
                        {fileUpload.preview ? (
                          <img 
                            src={fileUpload.preview} 
                            alt={fileUpload.file.name}
                            className="w-full h-20 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-xs truncate">{fileUpload.file.name}</p>
                        <p className="text-xs text-muted-foreground">{fileUpload.type}</p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Creating...' : 'Create Property'}
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