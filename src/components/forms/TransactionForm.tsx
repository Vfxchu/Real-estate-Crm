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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/useContacts";
import { useProperties } from "@/hooks/useProperties";
import { useDeals } from "@/hooks/useDeals";
import { Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { Transaction } from "@/types";
import { createTransaction, updateTransaction } from "@/services/transactions";

const transactionSchema = z.object({
  lead_id: z.string().min(1, "Contact is required"),
  type: z.string().min(1, "Transaction type is required"),
  amount: z.number().min(0).optional(),
  currency: z.string().default('AED'),
  status: z.string().optional(),
  notes: z.string().optional(),
  property_id: z.string().optional(),
  deal_id: z.string().optional(),
  // KYC fields
  source_of_funds: z.string().optional(),
  nationality: z.string().optional(),
  id_type: z.string().optional(),
  id_number: z.string().optional(),
  id_expiry: z.string().optional(),
  pep: z.boolean().default(false),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editTransaction?: Transaction | null;
  preselectedContact?: string;
  preselectedProperty?: string;
  preselectedDeal?: string;
}

const transactionTypeOptions = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'payment', label: 'Payment' },
  { value: 'commission', label: 'Commission' },
  { value: 'refund', label: 'Refund' },
  { value: 'fee', label: 'Fee' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const currencyOptions = [
  { value: 'AED', label: 'AED' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];

const idTypeOptions = [
  { value: 'emirates_id', label: 'Emirates ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'other', label: 'Other' },
];

const sourceOfFundsOptions = [
  { value: 'salary', label: 'Salary/Employment' },
  { value: 'business', label: 'Business Income' },
  { value: 'investment', label: 'Investment Returns' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'loan', label: 'Loan/Financing' },
  { value: 'gift', label: 'Gift' },
  { value: 'savings', label: 'Personal Savings' },
  { value: 'other', label: 'Other' },
];

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  editTransaction,
  preselectedContact,
  preselectedProperty,
  preselectedDeal
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contacts = useContacts();
  const { properties } = useProperties();
  const { deals } = useDeals();
  const [loading, setLoading] = useState(false);
  // Remove unused contactsList as SearchableContactCombobox loads its own contacts

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      lead_id: preselectedContact || '',
      type: '',
      amount: 0,
      currency: 'AED',
      status: 'pending',
      notes: '',
      property_id: preselectedProperty || '',
      deal_id: preselectedDeal || '',
      source_of_funds: '',
      nationality: '',
      id_type: '',
      id_number: '',
      id_expiry: '',
      pep: false,
    },
  });

  // Reset form when editTransaction changes
  useEffect(() => {
    if (editTransaction) {
      form.reset({
        lead_id: editTransaction.lead_id || '',
        type: editTransaction.type || '',
        amount: editTransaction.amount || 0,
        currency: editTransaction.currency || 'AED',
        status: editTransaction.status || 'pending',
        notes: editTransaction.notes || '',
        property_id: editTransaction.property_id || '',
        deal_id: editTransaction.deal_id || '',
        source_of_funds: editTransaction.source_of_funds || '',
        nationality: editTransaction.nationality || '',
        id_type: editTransaction.id_type || '',
        id_number: editTransaction.id_number || '',
        id_expiry: editTransaction.id_expiry || '',
        pep: editTransaction.pep || false,
      });
    } else {
      form.reset({
        lead_id: preselectedContact || '',
        type: '',
        amount: 0,
        currency: 'AED',
        status: 'pending',
        notes: '',
        property_id: preselectedProperty || '',
        deal_id: preselectedDeal || '',
        source_of_funds: '',
        nationality: '',
        id_type: '',
        id_number: '',
        id_expiry: '',
        pep: false,
      });
    }
  }, [editTransaction, form, preselectedContact, preselectedProperty, preselectedDeal]);

  // Load contacts is handled by SearchableContactCombobox internally
  useEffect(() => {
    // No longer needed as SearchableContactCombobox handles its own data
  }, [open]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setLoading(true);

      const transactionData = {
        type: data.type,
        lead_id: data.lead_id,
        amount: data.amount || null,
        currency: data.currency,
        status: data.status || null,
        notes: data.notes || null,
        property_id: data.property_id || null,
        deal_id: data.deal_id || null,
        source_of_funds: data.source_of_funds || null,
        nationality: data.nationality || null,
        id_type: data.id_type || null,
        id_number: data.id_number || null,
        id_expiry: data.id_expiry || null,
        pep: data.pep,
      };

      let result;
      if (editTransaction) {
        result = await updateTransaction(editTransaction.id, transactionData);
      } else {
        result = await createTransaction(data.lead_id, transactionData);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast({
        title: editTransaction ? 'Transaction updated successfully' : 'Transaction created successfully',
        description: editTransaction ? 'Transaction has been updated.' : 'New transaction has been recorded.',
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Transaction form error:', error);
      
      let errorMessage = error.message || 'Please check all required fields and try again.';
      if (error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You can only create transactions for your assigned contacts.';
      }
      
      toast({
        title: editTransaction ? 'Error updating transaction' : 'Error creating transaction',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {editTransaction ? 'Edit Transaction' : 'Record New Transaction'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lead_id"
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type *</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={transactionTypeOptions}
                          placeholder="Select type"
                          allowClear={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={statusOptions}
                          placeholder="Select status"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Related Entities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Property</FormLabel>
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
                  name="deal_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Deal</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={deals.map(d => ({ 
                            value: d.id, 
                            label: d.title 
                          }))}
                          placeholder="Select deal"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* KYC Information */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="text-lg font-semibold">KYC & Compliance Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source_of_funds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source of Funds</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={sourceOfFundsOptions}
                          placeholder="Select source"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter nationality" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Type</FormLabel>
                      <FormControl>
                        <ClearableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={idTypeOptions}
                          placeholder="Select ID type"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ID number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pep"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Politically Exposed Person (PEP)
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check if the person is politically exposed
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about this transaction..."
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
                {loading ? 'Saving...' : editTransaction ? 'Update Transaction' : 'Record Transaction'}
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