import React, { useEffect, useMemo, useState } from 'react';
import { useContacts, type ContactStatus } from '@/hooks/useContacts';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Download, Upload, GitMerge, X, Plus, Phone, Mail, MessageSquare, Filter, Edit, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LeadMeta } from '@/components/leads/LeadMeta';
import { supabase } from '@/integrations/supabase/client';
import { deleteLead } from '@/services/leads';
import ClearableSelect from '@/components/ui/ClearableSelect';
import ContactForm from '@/components/contacts/ContactForm';
import ContactDetailDrawer from '@/components/contacts/ContactDetailDrawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type StatusFilter = 'all' | ContactStatus;
type InterestFilter = 'all' | 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor';

// Debounced search hook
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Column presets by interest type
const getColumnsByInterestType = (interestType: InterestFilter) => {
  switch (interestType) {
    case 'buyer':
      return ['name', 'phone', 'property_type', 'bedrooms', 'location', 'budget_sale_band', 'contact_status', 'notes', 'updated_at'];
    case 'seller':
      return ['name', 'phone', 'property_type', 'bedrooms', 'location', 'budget_sale_band', 'contact_status', 'notes', 'updated_at'];
    case 'landlord':
      return ['name', 'phone', 'property_type', 'bedrooms', 'location', 'budget_rent_band', 'contact_status', 'notes', 'updated_at'];
    case 'tenant':
      return ['name', 'phone', 'property_type', 'bedrooms', 'location', 'budget_rent_band', 'notes', 'updated_at'];
    case 'investor':
      return ['name', 'phone', 'property_type', 'bedrooms', 'location', 'budget_sale_band', 'notes', 'contact_status', 'updated_at'];
    default:
      return ['name', 'phone', 'email', 'contact_status', 'interest_tags', 'updated_at', 'actions'];
  }
};

export default function Contacts() {
  const { user, profile } = useAuth();
  const { list, updateContact, mergeContacts, potentialDuplicates, toCSV } = useContacts();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  // URL-driven state (normalize empty strings to undefined)
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 25;
  const q = searchParams.get('q') || '';
  const status = (searchParams.get('status') || 'all') as StatusFilter;
  const interestType = (searchParams.get('interest_type') || 'all') as InterestFilter;
  const source = searchParams.get('source') || undefined;
  const segment = searchParams.get('segment') || undefined;
  const subtype = searchParams.get('subtype') || undefined;
  const bedrooms = searchParams.get('bedrooms') || undefined;
  const sizeBand = searchParams.get('size_band') || undefined;
  const location = searchParams.get('location') || undefined;
  const interestTags = searchParams.get('interest_tags') || undefined;
  const category = searchParams.get('category') || undefined;
  const budgetSaleBand = searchParams.get('budget_sale_band') || undefined;
  const budgetRentBand = searchParams.get('budget_rent_band') || undefined;
  const contactPref = searchParams.get('contact_pref') || undefined;
  
  // Local state
  const [searchInput, setSearchInput] = useState(q);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [interestFilter, setInterestFilter] = useState<InterestFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  
  // 300ms debounced search
  const debouncedSearch = useDebounced(searchInput, 300);
  
  const dupes = useMemo(() => potentialDuplicates(rows), [rows, potentialDuplicates]);
  const columns = getColumnsByInterestType(interestType);

  const fetchRows = async () => {
    setLoading(true);
    try {
      // Apply advanced filters if enabled
      const filters: any = {
        source: source || undefined,
        segment: segment || undefined,
        subtype: subtype || undefined,
        bedrooms: bedrooms || undefined,
        size_band: sizeBand || undefined,
        location_address: locationFilter || location || undefined,
        interest_tags: interestTags || undefined,
        category: category || undefined,
        budget_sale_band: budgetSaleBand || undefined,
        budget_rent_band: budgetRentBand || undefined,
        contact_pref: contactPref || undefined,
      };

      // Apply advanced filters
      if (showAdvancedFilters) {
        if (statusFilter !== 'all') filters.contact_status = statusFilter;
        if (interestFilter !== 'all') filters.interest_type = interestFilter;
        if (sourceFilter !== 'all') filters.source = sourceFilter;
      }

      const { data, total: rowTotal, error } = await list({
        q: debouncedSearch,
        status_category: statusFilter === 'all' ? status : statusFilter,
        interest_type: interestFilter === 'all' ? interestType : interestFilter,
        page,
        pageSize,
        filters,
      });
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      
      // Filter for closed leads that should appear as contacts
      let contactData = data || [];
      
      // Add closed leads as contacts if they don't already exist
      if (status === 'all' || status === 'active_client' || status === 'past_client') {
        try {
          const { data: closedLeads } = await supabase
            .from('leads')
            .select('*, profiles(name, email)')
            .in('status', ['won', 'lost']);
            
          if (closedLeads) {
            const closedAsContacts = closedLeads.map(lead => ({
              ...lead,
              contact_status: lead.status === 'won' ? 'active_client' : 'past_client',
              // Make sure these are treated as contacts, not leads
              is_closed_lead: true
            }));
            
            // Filter duplicates and merge
            const existingIds = contactData.map(c => c.id);
            const newContacts = closedAsContacts.filter(c => !existingIds.includes(c.id));
            contactData = [...contactData, ...newContacts];
          }
        } catch (closedLeadError) {
          console.error('Failed to fetch closed leads:', closedLeadError);
        }
      }
      
      setRows(contactData);
      setTotal(rowTotal || contactData.length);
    } finally {
      setLoading(false);
    }
  };

  // Enable cross-module synchronization
  useSync({
    onLeadsChange: fetchRows,
    onContactsChange: fetchRows,
    onActivitiesChange: fetchRows,
  });

  // Update URL params (avoid empty strings)
  const updateUrlParam = (key: string, value: string | number | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '') {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    // Reset page when filters change (except when changing page itself)
    if (key !== 'page') {
      params.delete('page');
    }
    setSearchParams(params);
  };

  // Sync search input with URL
  useEffect(() => {
    if (debouncedSearch !== q) {
      updateUrlParam('q', debouncedSearch);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);


  useEffect(() => {
    fetchRows();
  }, [page, pageSize, q, status, interestType, source, segment, subtype, bedrooms, sizeBand, locationFilter, location, interestTags, category, budgetSaleBand, budgetRentBand, contactPref, statusFilter, interestFilter, sourceFilter, ownerFilter, dateRangeFilter]);

  // Refresh when any part of the app creates/updates leads
  useEffect(() => {
    const handler = () => fetchRows();
    window.addEventListener('leads:changed', handler as EventListener);
    return () => window.removeEventListener('leads:changed', handler as EventListener);
  }, []);

  const onExport = () => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export complete', description: `Exported ${rows.length} contacts` });
  };

  const onImportStub = async (file: File) => {
    try {
      await file.text();
      toast({ title: 'Import stub', description: 'File read — bulk insert will be added later.' });
    } catch (error) {
      toast({ title: 'Import error', description: 'Could not read file', variant: 'destructive' });
    }
  };

  const updateContactStatus = async (contactId: string, newStatus: ContactStatus) => {
    const { error } = await updateContact(contactId, { contact_status: newStatus });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchRows();
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const ContactCard = ({ contact }: { contact: any }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrawerId(contact.id)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{contact.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setDrawerId(contact.id);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {contact.phone && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${contact.phone}`, '_self');
                }}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </DropdownMenuItem>
              )}
              {contact.email && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  window.open(`mailto:${contact.email}`, '_blank');
                }}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-2">
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {contact.email}
            </div>
          )}
          
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant={contact.contact_status === 'lead' ? 'secondary' : 'default'} className="text-xs">
              {contact.contact_status}
            </Badge>
            {contact.interest_tags?.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
            {contact.interest_tags?.length > 2 && (
              <Badge variant="outline" className="text-xs">+{contact.interest_tags.length - 2}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-xl sm:text-2xl font-bold">Contacts</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddOpen(true)} size={isMobile ? "sm" : "default"}>
            <Plus className="mr-2 h-4 w-4" />
            {isMobile ? "New" : "New Contact"}
          </Button>
          <Button variant="outline" onClick={onExport} disabled={!rows.length} size={isMobile ? "sm" : "default"}>
            <Download className="mr-2 h-4 w-4" />
            {isMobile ? "" : "Export"}
          </Button>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportStub(file);
              }}
            />
            <Button variant="outline" asChild size={isMobile ? "sm" : "default"}>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {isMobile ? "" : "Import"}
              </span>
            </Button>
          </label>
          
          <Button 
            variant="secondary" 
            onClick={() => setShowDuplicates(true)}
            disabled={dupes.length === 0}
            size={isMobile ? "sm" : "default"}
          >
            <GitMerge className="mr-2 h-4 w-4" />
            {isMobile ? `(${dupes.length})` : `Merge (${dupes.length})`}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search name, email, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Quick Status Filters */}
            <ClearableSelect
              value={status}
              onChange={(value) => updateUrlParam('status', value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'lead', label: 'Leads' },
                { value: 'active_client', label: 'Active Clients' },
                { value: 'past_client', label: 'Past Clients' },
              ]}
              placeholder="Status"
              allowClear={false}
              className="w-32 sm:w-36"
            />

            <ClearableSelect
              value={interestType}
              onChange={(value) => updateUrlParam('interest_type', value)}
              options={[
                { value: 'all', label: 'All Interests' },
                { value: 'buyer', label: 'Buyers' },
                { value: 'seller', label: 'Sellers' },
                { value: 'landlord', label: 'Landlords' },
                { value: 'tenant', label: 'Tenants' },
                { value: 'investor', label: 'Investors' },
              ]}
              placeholder="Interest"
              allowClear={false}
              className="w-32 sm:w-36"
            />
            
            <div className="flex flex-wrap gap-2">
              <Switch
                checked={showAdvancedFilters}
                onCheckedChange={setShowAdvancedFilters}
                id="advanced-mode"
              />
              <Label htmlFor="advanced-mode" className="text-sm">Advanced Search</Label>
            </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <ClearableSelect
                      value={source}
                      onChange={(value) => updateUrlParam('source', value)}
                      options={[
                        { value: "website", label: "Website" },
                        { value: "referral", label: "Referral" },
                        { value: "email_campaign", label: "Email Campaign" },
                        { value: "whatsapp_campaign", label: "WhatsApp Campaign" },
                        { value: "property_finder", label: "Property Finder" },
                        { value: "bayut_dubizzle", label: "Bayut/Dubizzle" },
                        { value: "inbound_call", label: "Inbound Call" },
                        { value: "outbound_call", label: "Outbound Call" },
                      ]}
                      placeholder="All sources"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <ClearableSelect
                      value={category}
                      onChange={(value) => updateUrlParam('category', value)}
                      options={[
                        { value: "property", label: "Property" },
                        { value: "requirement", label: "Requirement" }
                      ]}
                      placeholder="All categories"
                      allowClear={true}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Property Type</label>
                    <ClearableSelect
                      value={segment}
                      onChange={(value) => updateUrlParam('segment', value)}
                      options={[
                        { value: "residential", label: "Residential" },
                        { value: "commercial", label: "Commercial" }
                      ]}
                      placeholder="All types"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Subtype</label>
                    <ClearableSelect
                      value={subtype}
                      onChange={(value) => updateUrlParam('subtype', value)}
                      options={[
                        { value: "Apartment", label: "Apartment" },
                        { value: "Townhouse", label: "Townhouse" },
                        { value: "Villa", label: "Villa" },
                        { value: "Plot", label: "Plot" },
                        { value: "Building", label: "Building" },
                        { value: "Office", label: "Office" },
                        { value: "Shop", label: "Shop" }
                      ]}
                      placeholder="All subtypes"
                      allowClear={true}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Bedrooms</label>
                    <ClearableSelect
                      value={bedrooms}
                      onChange={(value) => updateUrlParam('bedrooms', value)}
                      options={[
                        { value: "Studio", label: "Studio" },
                        { value: "1BR", label: "1BR" },
                        { value: "2BR", label: "2BR" },
                        { value: "3BR", label: "3BR" },
                        { value: "4BR", label: "4BR" },
                        { value: "5BR", label: "5BR" },
                        { value: "6+ BR", label: "6+ BR" }
                      ]}
                      placeholder="All bedrooms"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Sale Budget</label>
                    <ClearableSelect
                      value={budgetSaleBand}
                      onChange={(value) => updateUrlParam('budget_sale_band', value)}
                      options={[
                        { value: "under 500k", label: "Under AED 500K" },
                        { value: "500k-1m", label: "AED 500K - 1M" },
                        { value: "1m-2m", label: "AED 1M - 2M" },
                        { value: "2m-5m", label: "AED 2M - 5M" },
                        { value: "above 5m", label: "Above AED 5M" }
                      ]}
                      placeholder="All sale budgets"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Rent Budget</label>
                    <ClearableSelect
                      value={budgetRentBand}
                      onChange={(value) => updateUrlParam('budget_rent_band', value)}
                      options={[
                        { value: "under 50k", label: "Under AED 50K/year" },
                        { value: "50k-100k", label: "AED 50K - 100K/year" },
                        { value: "100k-200k", label: "AED 100K - 200K/year" },
                        { value: "200k-500k", label: "AED 200K - 500K/year" },
                        { value: "above 500k", label: "Above AED 500K/year" }
                      ]}
                      placeholder="All rent budgets"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      placeholder="Enter location..."
                      value={location || ''}
                      onChange={(e) => updateUrlParam('location', e.target.value)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Content */}
      {isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No contacts found</p>
              </CardContent>
            </Card>
          ) : (
            rows.map((contact) => <ContactCard key={contact.id} contact={contact} />)
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(pageSize)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No contacts found</p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((contact) => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrawerId(contact.id)}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={contact.contact_status === 'lead' ? 'secondary' : 'default'}>
                        {contact.contact_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.interest_tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {contact.interest_tags?.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{contact.interest_tags.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {contact.segment && <div className="capitalize">{contact.segment}</div>}
                        {contact.subtype && <div className="text-muted-foreground">{contact.subtype}</div>}
                        {contact.bedrooms && <div className="text-muted-foreground">{contact.bedrooms}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {contact.budget_sale_band && <div>{contact.budget_sale_band}</div>}
                        {contact.budget_rent_band && <div>{contact.budget_rent_band}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.updated_at && format(new Date(contact.updated_at), 'MMM dd')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setDrawerId(contact.id);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {contact.phone && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${contact.phone}`, '_self');
                            }}>
                              <Phone className="mr-2 h-4 w-4" />
                              Call
                            </DropdownMenuItem>
                          )}
                          {contact.email && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(`mailto:${contact.email}`, '_blank');
                            }}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => page > 1 && updateUrlParam('page', page - 1)}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => updateUrlParam('page', pageNum)}
                      isActive={pageNum === page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => page < totalPages && updateUrlParam('page', page + 1)}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <ContactForm onSuccess={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <ContactDetailDrawer
        contact={rows.find(r => r.id === drawerId) || null}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}