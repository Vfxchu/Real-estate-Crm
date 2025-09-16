import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ClearableSelect from '@/components/ui/ClearableSelect';
import { asOptional } from '@/lib/schema-utils';
import { ContactStatus } from '@/hooks/useContacts';
import { createLead, updateLead } from '@/services/leads';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: asOptional(z.string()),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'qualified', 'negotiating', 'won', 'lost']).default('new'),
  contact_status: z.enum(['lead', 'active_client', 'past_client']).default('lead'),
  interest_tags: z.array(z.string()).default([]),
  category: asOptional(z.enum(['property', 'requirement'])),
  segment: asOptional(z.enum(['residential', 'commercial'])),
  subtype: asOptional(z.string()),
  budget_sale_band: asOptional(z.string()),
  budget_rent_band: asOptional(z.string()),
  bedrooms: asOptional(z.string()),
  size_band: asOptional(z.string()),
  location_address: asOptional(z.string()),
  location_place_id: asOptional(z.string()),
  location_lat: asOptional(z.number()),
  location_lng: asOptional(z.number()),
  contact_pref: z.array(z.string()).default([]),
  notes: asOptional(z.string()),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  contact?: Lead;
  onSuccess?: (contactData?: any) => void;
  onCancel?: () => void;
  className?: string;
}

const interestTagOptions = [
  { value: 'Buyer', label: 'Buyer' },
  { value: 'Seller', label: 'Seller' },
  { value: 'Landlord', label: 'Landlord' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'Investor', label: 'Investor' },
];

const budgetSaleOptions = [
  { value: 'under 500k', label: 'Under AED 500K' },
  { value: '500k-1m', label: 'AED 500K - 1M' },
  { value: '1m-2m', label: 'AED 1M - 2M' },
  { value: '2m-5m', label: 'AED 2M - 5M' },
  { value: 'above 5m', label: 'Above AED 5M' },
];

const budgetRentOptions = [
  { value: 'under 50k', label: 'Under AED 50K/year' },
  { value: '50k-100k', label: 'AED 50K - 100K/year' },
  { value: '100k-200k', label: 'AED 100K - 200K/year' },
  { value: '200k-500k', label: 'AED 200K - 500K/year' },
  { value: 'above 500k', label: 'Above AED 500K/year' },
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
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

export default function ContactForm({ contact, onSuccess, onCancel, className }: ContactFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name || '',
      phone: contact?.phone || '',
      email: contact?.email || '',
      status: contact?.status || 'new',
      contact_status: (contact?.contact_status as ContactStatus) || 'lead',
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
      notes: contact?.notes || '',
      priority: contact?.priority || 'medium',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setLoading(true);
      
      let result;
      if (contact?.id) {
        result = await updateLead(contact.id, data);
        toast({ 
          title: 'Contact updated', 
          description: 'Contact has been updated successfully.'
        });
      } else {
        result = await createLead(data);
        toast({ 
          title: 'Contact created', 
          description: 'New contact has been added successfully.'
        });
      }

      if (result.error) {
        throw new Error(result.error.message);
      }
      
      // Trigger refresh events
      window.dispatchEvent(new CustomEvent('leads:changed'));
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      
      // Pass the created/updated contact to onSuccess
      onSuccess?.(result.data);
    } catch (error: any) {
      console.error('Contact form error:', error);
      
      let errorMessage = error.message || 'Failed to save contact';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only create contacts assigned to yourself.';
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

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
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

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Category</FormLabel>
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
          </div>

          {/* Interest & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'property', label: 'Property' },
                        { value: 'requirement', label: 'Requirement' },
                      ]}
                      placeholder="Select category"
                    />
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
                  <FormLabel>Segment</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'residential', label: 'Residential' },
                        { value: 'commercial', label: 'Commercial' },
                      ]}
                      placeholder="Select segment"
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
                  <FormLabel>Property Type</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={subtypeOptions}
                      placeholder="Select property type"
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Budget Bands - Mutually Exclusive */}
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
                  <FormLabel>Rent Budget</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        if (value) form.setValue('budget_sale_band', '');
                      }}
                      options={budgetRentOptions}
                      placeholder="Select rent budget"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location */}
          <FormField
            control={form.control}
            name="location_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Enter location/address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add any additional notes..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sticky Submit Actions */}
          <div className="sticky bottom-0 bg-background p-4 border-t flex gap-2 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" className="btn-primary" disabled={loading || form.formState.isSubmitting}>
              {(loading || form.formState.isSubmitting) ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}