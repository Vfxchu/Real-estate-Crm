import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";
import ClearableSelect from "@/components/ui/ClearableSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDeals, Deal } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useProperties } from "@/hooks/useProperties";
import { Loader2, DollarSign } from "lucide-react";

const dealSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  contact_id: z.string().min(1, "Contact is required"),
  property_id: z.string().optional(),
  status: z.enum(['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], { 
    required_error: "Deal status is required" 
  }),
  value: z.number().min(0).optional(),
  currency: z.string().default('AED'),
  close_date: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editDeal?: Deal | null;
  preselectedContact?: string;
  preselectedProperty?: string;
}

const statusOptions = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const currencyOptions = [
  { value: 'AED', label: 'AED' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];

const sourceOptions = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
];

export const DealForm: React.FC<DealFormProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  editDeal,
  preselectedContact,
  preselectedProperty
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createDeal, updateDeal } = useDeals();
  const contacts = useContacts();
  const { properties } = useProperties();
  const [loading, setLoading] = useState(false);
  // Remove unused contactsList as SearchableContactCombobox loads its own contacts

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      contact_id: preselectedContact || '',
      property_id: preselectedProperty || '',
      status: 'prospecting',
      value: 0,
      currency: 'AED',
      close_date: '',
      probability: 50,
      notes: '',
      source: '',
    },
  });

  // Reset form when editDeal changes
  useEffect(() => {
    if (editDeal) {
      form.reset({
        title: editDeal.title || '',
        contact_id: editDeal.contact_id || '',
        property_id: editDeal.property_id || '',
        status: editDeal.status as any || 'prospecting',
        value: editDeal.value || 0,
        currency: editDeal.currency || 'AED',
        close_date: editDeal.close_date || '',
        probability: editDeal.probability || 50,
        notes: editDeal.notes || '',
        source: editDeal.source || '',
      });
    } else {
      form.reset({
        title: '',
        contact_id: preselectedContact || '',
        property_id: preselectedProperty || '',
        status: 'prospecting',
        value: 0,
        currency: 'AED',
        close_date: '',
        probability: 50,
        notes: '',
        source: '',
      });
    }
  }, [editDeal, form, preselectedContact, preselectedProperty]);

  // Load contacts is handled by SearchableContactCombobox internally
  useEffect(() => {
    // No longer needed as SearchableContactCombobox handles its own data
  }, [open]);

  const onSubmit = async (data: DealFormData) => {
    try {
      setLoading(true);

      const dealData = {
        title: data.title,
        contact_id: data.contact_id,
        property_id: data.property_id || null,
        status: data.status,
        value: data.value || null,
        currency: data.currency,
        close_date: data.close_date || null,
        probability: data.probability || null,
        notes: data.notes || null,
        source: data.source || null,
      };

      let result;
      if (editDeal) {
        result = await updateDeal(editDeal.id, dealData);
      } else {
        result = await createDeal(dealData);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast({
        title: editDeal ? 'Deal updated successfully' : 'Deal created successfully',
        description: editDeal ? 'Deal has been updated.' : 'New deal has been added.',
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Deal form error:', error);
      
      let errorMessage = error.message || 'Please check all required fields and try again.';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only create deals assigned to yourself.';
      }
      
      toast({
        title: editDeal ? 'Error updating deal' : 'Error creating deal',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {editDeal ? 'Edit Deal' : 'Create New Deal'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Deal Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter deal title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact *</FormLabel>
                    <FormControl>
                      <SearchableContactCombobox
                        value={field.value}
                        onChange={(contactId) => field.onChange(contactId)}
                        placeholder="Select contact"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property (Optional)</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={properties.map(p => ({ 
                          value: p.id, 
                          label: `${p.title} - ${p.address}` 
                        }))}
                        placeholder="Select property"
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
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={statusOptions}
                        placeholder="Select status"
                        allowClear={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="50"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Deal Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={currencyOptions}
                        placeholder="Select currency"
                        allowClear={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Close Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={sourceOptions}
                        placeholder="Select source"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about this deal..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Saving...' : editDeal ? 'Update Deal' : 'Create Deal'}
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