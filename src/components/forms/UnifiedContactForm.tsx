import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';
import ClearableSelect from '@/components/ui/ClearableSelect';
import { asOptional } from '@/lib/schema-utils';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types';
import { createLead, updateLead } from '@/services/leads';
import { linkPropertyToContact } from '@/services/contacts';
import { uploadFile } from '@/services/storage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, FileText } from 'lucide-react';

// Map source values to match database enum
const mapSourceValue = (source: string): "email" | "other" | "referral" | "website" | "social_media" | "advertisement" | "cold_call" => {
  const sourceMap: Record<string, "email" | "other" | "referral" | "website" | "social_media" | "advertisement" | "cold_call"> = {
    'email_campaign': 'email',
    'whatsapp_campaign': 'social_media', 
    'property_finder': 'website',
    'bayut_dubizzle': 'website',
    'inbound_call': 'cold_call',
    'outbound_call': 'cold_call',
    'campaigns': 'advertisement',
    'organic_social_media': 'social_media'
  };
  
  return sourceMap[source] || (source as "email" | "other" | "referral" | "website" | "social_media" | "advertisement" | "cold_call");
};

const unifiedFormSchema = z.object({
  // Basic Information
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  
  // Lead Source & Priority
  source: asOptional(z.enum(['website', 'referral', 'email_campaign', 'whatsapp_campaign', 'property_finder', 'bayut_dubizzle', 'inbound_call', 'outbound_call', 'campaigns', 'organic_social_media'])),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  
  // Interest & Category
  interest_tags: z.array(z.string()).default([]),
  category: asOptional(z.enum(['property', 'requirement'])),
  segment: asOptional(z.enum(['residential', 'commercial'])),
  subtype: asOptional(z.string()),
  
  // Budget Information
  budget_sale_band: asOptional(z.string()),
  budget_rent_band: asOptional(z.string()),
  bedrooms: asOptional(z.string()),
  size_band: asOptional(z.string()),
  
  // Location
  location_address: asOptional(z.string()),
  location_place_id: asOptional(z.string()),
  location_lat: asOptional(z.number()),
  location_lng: asOptional(z.number()),
  
  // Communication Preferences
  contact_pref: z.array(z.string()).default([]),
  
  // Status (for contacts)
  contact_status: z.enum(['lead', 'active_client', 'past_client']).default('lead'),
  
  // NEW FIELDS
  client_address: asOptional(z.string()),
  
  // Notes
  notes: asOptional(z.string()),
}).refine((data) => !(data.budget_sale_band && data.budget_rent_band), {
  message: "Choose either Sale budget or Rent budget (not both).",
  path: ["budget_sale_band"],
});

type UnifiedFormData = z.infer<typeof unifiedFormSchema>;

interface UnifiedContactFormProps {
  contact?: Lead;
  onSuccess?: (contactData?: any) => void;
  onCancel?: () => void;
  className?: string;
  mode?: 'lead' | 'contact' | 'property'; // Different modes for different contexts
  title?: string;
  initialPropertyId?: string; // Property to link to when creating contact
  propertyRole?: 'interested_buyer' | 'interested_tenant' | 'owner' | 'landlord';
}

const interestTagOptions = [
  'Buyer', 'Seller', 'Landlord', 'Tenant', 'Investor'
];

const sourceOptions = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'whatsapp_campaign', label: 'WhatsApp Campaign' },
  { value: 'property_finder', label: 'Property Finder' },
  { value: 'bayut_dubizzle', label: 'Bayut/Dubizzle' },
  { value: 'inbound_call', label: 'Inbound Call' },
  { value: 'outbound_call', label: 'Outbound Call' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'organic_social_media', label: 'Organic Social Media' },
];

const budgetSaleOptions = [
  { value: 'under AED1M', label: 'Under AED 1M' },
  { value: 'AED1M – AED2M', label: 'AED 1M - 2M' },
  { value: 'AED2M – AED5M', label: 'AED 2M - 5M' },
  { value: 'AED5M – AED10M', label: 'AED 5M - 10M' },
  { value: 'AED10M - AED15M', label: 'AED 10M - 15M' },
  { value: 'Above AED15M', label: 'Above AED 15M' },
];

const budgetRentOptions = [
  { value: 'under AED100K', label: 'Under AED 100K/year' },
  { value: 'AED100K – AED200K', label: 'AED 100K - 200K/year' },
  { value: 'AED200K – AED300K', label: 'AED 200K - 300K/year' },
  { value: 'AED300K – AED500K', label: 'AED 300K - 500K/year' },
  { value: 'AED500K – AED1M', label: 'AED 500K - 1M/year' },
  { value: 'Above AED1M', label: 'Above AED 1M/year' },
];

const bedroomOptions = [
  { value: 'Studio', label: 'Studio' },
  { value: '1BR', label: '1BR' },
  { value: '2BR', label: '2BR' },
  { value: '3BR', label: '3BR' },
  { value: '4BR', label: '4BR' },
  { value: '5BR', label: '5BR' },
  { value: '6+ BR', label: '6+ BR' },
];

const subtypeOptions = [
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Plot', label: 'Plot' },
  { value: 'Building', label: 'Building' },
  { value: 'Office', label: 'Office' },
  { value: 'Shop', label: 'Shop' },
];

const contactPrefOptions = [
  { value: 'call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

function deriveCategory(tags: string[]): "property" | "requirement" | undefined {
  const hasProperty = tags.some((t) => t === "Seller" || t === "Landlord");
  const hasRequirement = tags.some((t) => t === "Buyer" || t === "Tenant" || t === "Investor");
  if (hasProperty && !hasRequirement) return "property";
  if (hasRequirement && !hasProperty) return "requirement";
  return undefined;
}

export default function UnifiedContactForm({
  contact,
  onSuccess,
  onCancel,
  className,
  mode = 'contact',
  title,
  initialPropertyId,
  propertyRole = 'interested_buyer'
}: UnifiedContactFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string; id?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  
  // Google Places for location
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const [placesReady, setPlacesReady] = useState(false);

  useEffect(() => {
    const key = (window as any)?.__GOOGLE_MAPS_API_KEY;
    if (!key) return;
    if ((window as any).google?.maps?.places) {
      setPlacesReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.onload = () => setPlacesReady(true);
    script.onerror = () => setPlacesReady(false);
    document.head.appendChild(script);
  }, []);

  const form = useForm<UnifiedFormData>({
    resolver: zodResolver(unifiedFormSchema),
    mode: 'onChange', // Enable real-time validation
    reValidateMode: 'onChange',
    defaultValues: {
      name: contact?.name || '',
      phone: contact?.phone || '',
      email: contact?.email || '',
      source: (contact as any)?.source || undefined,
      priority: contact?.priority as 'low' | 'medium' | 'high' || 'medium',
      interest_tags: contact?.interest_tags || [],
      category: contact?.category as 'property' | 'requirement' | undefined,
      segment: contact?.segment as 'residential' | 'commercial' | undefined,
      subtype: contact?.subtype || '',
      budget_sale_band: contact?.budget_sale_band || '',
      budget_rent_band: contact?.budget_rent_band || '',
      bedrooms: contact?.bedrooms || '',
      size_band: contact?.size_band || '',
      location_address: contact?.location_address || '',
      contact_pref: contact?.contact_pref || [],
      contact_status: (contact?.contact_status as 'lead' | 'active_client' | 'past_client') || 'lead',
      client_address: (contact as any)?.client_address || '',
      notes: contact?.notes || '',
    },
  });

  const tags = form.watch("interest_tags") || [];
  const derivedCategory = useMemo(() => form.watch("category") || deriveCategory(tags), [form, tags]);
  const segment = form.watch("segment");

  // Wire autocomplete when residential
  useEffect(() => {
    if (!placesReady || segment !== "residential") return;
    if (locationInputRef.current && (window as any).google?.maps?.places?.Autocomplete) {
      const ac = new (window as any).google.maps.places.Autocomplete(locationInputRef.current, {
        fields: ["place_id", "formatted_address", "geometry"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place) return;
        const loc = place.geometry?.location;
        form.setValue("location_place_id", place.place_id || undefined);
        form.setValue("location_address", place.formatted_address || undefined);
        if (loc) {
          form.setValue("location_lat", typeof loc.lat === "function" ? loc.lat() : (loc.lat as any));
          form.setValue("location_lng", typeof loc.lng === "function" ? loc.lng() : (loc.lng as any));
        }
      });
    }
  }, [placesReady, segment, form]);

  // Load existing files for contact
  useEffect(() => {
    if (contact?.id) {
      loadExistingFiles();
    }
  }, [contact?.id]);

  const loadExistingFiles = async () => {
    if (!contact?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('contact_files')
        .select('*')
        .eq('contact_id', contact.id);
      
      if (error) throw error;
      
      setUploadedFiles(data?.map(f => ({
        name: f.name,
        path: f.path,
        id: f.id
      })) || []);
    } catch (error: any) {
      console.error('Failed to load existing files:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user?.id) return;

    setUploading(true);
    try {
      const newFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `documents/${user.id}/temp/${fileName}`;

        const uploadRes = await uploadFile('documents', filePath, file);
        if (uploadRes.error) throw uploadRes.error;

        newFiles.push({
          name: file.name,
          path: uploadRes.path || filePath
        });
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({ title: 'Success', description: `${newFiles.length} file(s) uploaded successfully` });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: UnifiedFormData) => {
    try {
      setLoading(true);
      
      // Prepare lead data
      const leadData = {
        ...data,
        category: derivedCategory,
        // For lead mode, ensure it creates a lead entry
        ...(mode === 'lead' ? { status: 'new' } : {}),
        // For contact mode, determine if it should be a lead based on interest
        ...(mode === 'contact' && data.contact_status === 'lead' ? { status: 'new' } : {}),
      };

      // Map source values to match database enum
      const mappedLeadData = {
        ...leadData,
        source: leadData.source ? mapSourceValue(leadData.source) : undefined
      };

      let result;
      
      // If mode is 'contact', save to contacts table instead of leads
      if (mode === 'contact') {
        const contactData = {
          full_name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          marketing_source: data.source || null,
          interest_tags: data.interest_tags || [],
          status_mode: 'auto' as 'auto',
          status_effective: (data.contact_status === 'active_client' ? 'active' : 
                            data.contact_status === 'past_client' ? 'past' : 'active') as 'active' | 'past',
          created_by: user?.id
        };
        
        if (contact?.id) {
          const { data: updatedData, error } = await supabase
            .from('contacts')
            .update(contactData)
            .eq('id', contact.id)
            .select()
            .single();
          
          result = { data: updatedData, error };
          
          toast({ 
            title: 'Updated successfully', 
            description: 'Contact has been updated.'
          });
        } else {
          const { data: newData, error } = await supabase
            .from('contacts')
            .insert([contactData])
            .select()
            .single();
          
          result = { data: newData, error };
          
          toast({ 
            title: 'Created successfully', 
            description: 'New contact has been created.'
          });

          // Link to property if specified
          if (initialPropertyId && result.data?.id && propertyRole) {
            try {
              await linkPropertyToContact({
                contactId: result.data.id,
                propertyId: initialPropertyId,
                role: propertyRole as any
              });
            } catch (linkError) {
              console.error('Failed to link property:', linkError);
            }
          }
        }
      } else {
        // Original lead mode logic
        if (contact?.id) {
          result = await updateLead(contact.id, mappedLeadData);
          toast({ 
            title: 'Updated successfully', 
            description: `${mode === 'lead' ? 'Lead' : 'Contact'} has been updated.`
          });
        } else {
          result = await createLead(mappedLeadData);
          toast({ 
            title: 'Created successfully', 
            description: `New ${mode === 'lead' ? 'lead' : 'contact'} has been created.`
          });

          // Create automatic tasks for leads
          if (mode === 'lead' || data.contact_status === 'lead') {
            await createAutomaticTasks(result.data?.id);
          }

          // Link to property if specified
          if (initialPropertyId && result.data?.id && propertyRole) {
            try {
              await linkPropertyToContact({
                contactId: result.data.id,
                propertyId: initialPropertyId,
                role: propertyRole as any
              });
            } catch (linkError) {
              console.error('Failed to link property:', linkError);
            }
          }
        }
      }

      if (result.error) {
        console.error('[FORM] Submission error:', result.error);
        throw new Error(result.error.message);
      }

      // Show success toast consistently
      if (!contact?.id) {
        toast({
          title: 'Success',
          description: `${mode === 'lead' ? 'Lead' : 'Contact'} created successfully.`,
        });
      }

      // Save uploaded files to database if we have a contact ID
      const contactId = result.data?.id || contact?.id;
      if (contactId && uploadedFiles.length > 0) {
        await saveFilesToDatabase(contactId);
      }
      
      // Trigger refresh events
      window.dispatchEvent(new CustomEvent('leads:changed'));
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      
      onSuccess?.(result.data);
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      let errorMessage = error.message || 'Failed to save';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only create records assigned to yourself.';
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createAutomaticTasks = async (leadId: string) => {
    if (!user?.id || !leadId) return;

    try {
      // Create default tasks: Call Back (30 min), Follow Up (1 day), Meeting (2 days) 
      const tasks = [
        {
          title: 'Call Back - New Lead',
          event_type: 'lead_call',
          start_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          lead_id: leadId,
          agent_id: user.id,
          created_by: user.id,
          description: 'Initial callback for new lead'
        },
        {
          title: 'Follow Up - Lead',
          event_type: 'lead_followup', 
          start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
          lead_id: leadId,
          agent_id: user.id,
          created_by: user.id,
          description: 'Follow up on lead progress'
        },
        {
          title: 'Schedule Meeting',
          event_type: 'contact_meeting',
          start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
          lead_id: leadId,
          agent_id: user.id,
          created_by: user.id,
          description: 'Schedule meeting with qualified lead'
        }
      ];

      const { error } = await supabase
        .from('calendar_events')
        .insert(tasks);

      if (error) {
        console.error('Failed to create automatic tasks:', error);
      }
    } catch (error) {
      console.error('Error creating automatic tasks:', error);
    }
  };

  const saveFilesToDatabase = async (contactId: string) => {
    try {
      const filesToSave = uploadedFiles.filter(f => !f.id); // Only save new files
      
      if (filesToSave.length === 0) return;

      const { error } = await supabase
        .from('contact_files')
        .insert(
          filesToSave.map(file => ({
            contact_id: contactId,
            name: file.name,
            path: file.path,
            type: 'document',
            tag: 'id' as const // Default tag for client documents
          }))
        );

      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to save files to database:', error);
      toast({
        title: 'Warning',
        description: 'Files uploaded but not linked to contact. Please refresh and try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={className}>
      <Card className="p-4 md:p-6 border-0 shadow-none">
        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+971501234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode !== 'property' && (
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Source</FormLabel>
                        <FormControl>
                          <ClearableSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={sourceOptions}
                            placeholder="Select source"
                            allowClear={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Client Information
              </h3>
              
              <FormField
                control={form.control}
                name="client_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter client's residential address..."
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Documents Upload */}
              <div>
                <label className="text-sm font-medium">Client Documents</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="documents-upload"
                    />
                    <label htmlFor="documents-upload">
                      <Button type="button" variant="outline" disabled={uploading} asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {uploading ? 'Uploading...' : 'Upload Documents'}
                        </span>
                      </Button>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Upload passport, ID, or other client documents
                    </span>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interest & Category */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Interest & Requirements
              </h3>
              
              <FormField
                control={form.control}
                name="interest_tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Type</FormLabel>
                    <FormControl>
                      <ToggleGroup
                        type="multiple"
                        value={field.value || []}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-2 justify-start"
                      >
                        {interestTagOptions.map((tag) => (
                          <ToggleGroupItem key={tag} value={tag} aria-label={tag} size="sm">
                            {tag}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {derivedCategory && (
                <div className="text-sm text-muted-foreground">
                  Category: <span className="font-medium capitalize">{derivedCategory}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { value: 'residential', label: 'Residential' },
                            { value: 'commercial', label: 'Commercial' }
                          ]}
                          placeholder="Select type"
                          allowClear={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtype</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={subtypeOptions}
                          placeholder="Select subtype"
                          allowClear={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={bedroomOptions}
                          placeholder="Select bedrooms"
                          allowClear={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode !== 'property' && (
                  <FormField
                    control={form.control}
                    name="contact_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <ClearableSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                              { value: 'lead', label: 'Lead' },
                              { value: 'active_client', label: 'Active Client' },
                              { value: 'past_client', label: 'Past Client' },
                            ]}
                            placeholder="Select status"
                            allowClear={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Budget Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Budget Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget_sale_band"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Budget</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            if (value) form.setValue('budget_rent_band', '');
                          }}
                          options={budgetSaleOptions}
                          placeholder="Select sale budget"
                          allowClear={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget_rent_band"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rental Budget</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            if (value) form.setValue('budget_sale_band', '');
                          }}
                          options={budgetRentOptions}
                          placeholder="Select rental budget"
                          allowClear={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Location Preferences
              </h3>
              <FormField
                control={form.control}
                name="location_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Location</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        ref={locationInputRef}
                        placeholder="Enter preferred location/area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Communication Preferences */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Communication Preferences
              </h3>
              <FormField
                control={form.control}
                name="contact_pref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Methods</FormLabel>
                    <FormControl>
                      <ToggleGroup
                        type="multiple"
                        value={field.value || []}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-2 justify-start"
                      >
                        {contactPrefOptions.map((option) => (
                          <ToggleGroupItem key={option.value} value={option.value} size="sm">
                            {option.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Additional Information
              </h3>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes or requirements..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sticky Submit Actions */}
            <div className="sticky bottom-0 bg-background p-4 border-t flex gap-2 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading || form.formState.isSubmitting}
                className="min-w-[120px]"
              >
                {(loading || form.formState.isSubmitting) ? 'Saving...' : 
                  contact ? `Update ${mode === 'lead' ? 'Lead' : 'Contact'}` : 
                  `Create ${mode === 'lead' ? 'Lead' : 'Contact'}`
                }
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}