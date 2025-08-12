import React, { useEffect, useMemo, useState } from 'react';
import { useContacts, type ContactStatus } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import LeadForm from '@/components/leads/LeadForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Download, Upload, GitMerge, X, Plus, Phone, Mail, MessageSquare, Filter, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LeadMeta } from '@/components/leads/LeadMeta';
import { supabase } from '@/integrations/supabase/client';
import { deleteLead } from '@/services/leads';

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
  
  // URL-driven state
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 25;
  const q = searchParams.get('q') || '';
  const status = (searchParams.get('status') || 'all') as StatusFilter;
  const interestType = (searchParams.get('interest_type') || 'all') as InterestFilter;
  const source = searchParams.get('source') || '';
  const segment = searchParams.get('segment') || '';
  const subtype = searchParams.get('subtype') || '';
  const bedrooms = searchParams.get('bedrooms') || '';
  const sizeBand = searchParams.get('size_band') || '';
  const location = searchParams.get('location') || '';
  
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
  
  // 300ms debounced search
  const debouncedSearch = useDebounced(searchInput, 300);
  
  const dupes = useMemo(() => potentialDuplicates(rows), [rows, potentialDuplicates]);
  const columns = getColumnsByInterestType(interestType);

  // Update URL params
  const updateUrlParam = (key: string, value: string | number) => {
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

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data, total: rowTotal, error } = await list({
        q: q,
        status_category: status === 'all' ? 'all' : status,
        interest_type: interestType,
        page,
        pageSize,
        filters: {
          source: source || undefined,
          segment: segment || undefined,
          subtype: subtype || undefined,
          bedrooms: bedrooms || undefined,
          size_band: sizeBand || undefined,
          location_address: location || undefined,
        },
      });
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      
      setRows(data || []);
      setTotal(rowTotal || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, pageSize, q, status, interestType, source, segment, subtype, bedrooms, sizeBand, location]);

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Contacts</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
          <Button variant="outline" onClick={onExport} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" />
            Export
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
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import (stub)
              </span>
            </Button>
          </label>
          
          <Button 
            variant="secondary" 
            onClick={() => setShowDuplicates(true)}
            disabled={dupes.length === 0}
          >
            <GitMerge className="mr-2 h-4 w-4" />
            De-duplicate ({dupes.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search name, email, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-sm"
          />
          
          <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <Select value={source} onValueChange={(value) => updateUrlParam('source', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All sources</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="email_campaign">Email Campaign</SelectItem>
                      <SelectItem value="whatsapp_campaign">WhatsApp Campaign</SelectItem>
                      <SelectItem value="property_finder">Property Finder</SelectItem>
                      <SelectItem value="bayut_dubizzle">Bayut/Dubizzle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Property Type</label>
                  <Select value={segment} onValueChange={(value) => updateUrlParam('segment', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Bedrooms</label>
                  <Select value={bedrooms} onValueChange={(value) => updateUrlParam('bedrooms', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All bedrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All bedrooms</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="1BR">1BR</SelectItem>
                      <SelectItem value="2BR">2BR</SelectItem>
                      <SelectItem value="3BR">3BR</SelectItem>
                      <SelectItem value="4BR">4BR</SelectItem>
                      <SelectItem value="5BR">5BR</SelectItem>
                      <SelectItem value="6+ BR">6+ BR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="Location contains..."
                    value={location}
                    onChange={(e) => updateUrlParam('location', e.target.value)}
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSearchParams({});
                    setSearchInput('');
                    setShowAdvancedFilters(false);
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {(['all', 'lead', 'active_client', 'past_client'] as StatusFilter[]).map(s => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateUrlParam('status', s)}
            >
              {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Interest Type:</span>
          {(['all', 'buyer', 'seller', 'landlord', 'tenant', 'investor'] as InterestFilter[]).map(t => (
            <Button
              key={t}
              variant={interestType === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateUrlParam('interest_type', t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted px-4 py-3 text-sm font-medium">
          <div>
            <input
              type="checkbox"
              checked={selected.length === rows.length && rows.length > 0}
              onChange={(e) => {
                setSelected(e.target.checked ? rows.map(r => r.id) : []);
              }}
            />
          </div>
          <div>Name</div>
          <div>Contact</div>
          <div>Details</div>
          <div>Status</div>
          <div>Last Update</div>
          <div>Actions</div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No contacts match your filters.
          </div>
        ) : (
          rows.map(row => (
            <div 
              key={row.id} 
              className="grid grid-cols-7 px-4 py-3 border-t hover:bg-accent/50 cursor-pointer"
              onClick={() => setDrawerId(row.id)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={(e) => {
                    setSelected(prev => 
                      e.target.checked 
                        ? [...prev, row.id]
                        : prev.filter(id => id !== row.id)
                    );
                  }}
                />
              </div>
              
              <div className="font-medium">{row.name}</div>
              
              <div className="text-sm space-y-1">
                <div>{row.phone}</div>
                <div className="text-muted-foreground">{row.email}</div>
              </div>
              
              <div className="text-sm">
                <LeadMeta lead={row} layout="table" />
              </div>
              
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  value={row.contact_status || 'lead'}
                  onValueChange={(value: ContactStatus) => updateContactStatus(row.id, value)}
                >
                  <SelectTrigger className="h-8 w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active_client">Active Client</SelectItem>
                    <SelectItem value="past_client">Past Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}
              </div>
              
              <div onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => page > 1 && updateUrlParam('page', page - 1)}
                className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => updateUrlParam('page', pageNum)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <PaginationItem>
                  <span className="px-3 py-2">...</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => updateUrlParam('page', totalPages)}
                    className="cursor-pointer"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => page < totalPages && updateUrlParam('page', page + 1)}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Contact Drawer */}
      {drawerId && (
        <ContactDrawer 
          id={drawerId} 
          onClose={() => setDrawerId(null)}
          onUpdate={fetchRows}
        />
      )}

      {/* New Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
          </DialogHeader>
          <LeadForm
            context={profile?.role === 'admin' ? 'admin' : 'agent'}
            onSuccess={async () => {
              await fetchRows();
              setAddOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Deduplication Dialog */}
      {showDuplicates && (
        <DeduplicateDialog 
          duplicateGroups={dupes}
          onClose={() => setShowDuplicates(false)}
          onMerge={async (primaryId, duplicateIds) => {
            const { error } = await mergeContacts(primaryId, duplicateIds);
            if (error) {
              toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } else {
              toast({ title: 'Merge complete', description: `Merged ${duplicateIds.length} duplicates` });
              fetchRows();
              setShowDuplicates(false);
            }
          }}
        />
      )}
    </div>
  );
}

function ContactDrawer({ id, onClose, onUpdate }: { 
  id: string; 
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { updateContact } = useContacts();
  const { toast } = useToast();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true);
      const { data: contactData, error: contactError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      
      if (contactError) {
        toast({ title: 'Error', description: contactError.message, variant: 'destructive' });
        return;
      }

      setContact(contactData);
      setLoading(false);
    };

    fetchContact();
  }, [id]);

  if (loading || !contact) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background p-6 rounded-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex z-50">
      <div className="ml-auto h-full w-full max-w-4xl bg-background overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">{contact.name}</h2>
              <div className="flex items-center gap-2">
                {contact.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${contact.phone}`}>
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </a>
                  </Button>
                )}
                {contact.email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </a>
                  </Button>
                )}
                {contact.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <DeleteLeadButton id={contact.id} onDeleted={() => { onUpdate(); onClose(); }} />
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Contact Details</TabsTrigger>
              <TabsTrigger value="enquiry">Enquiry Details</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-6">
              <ContactDetailsTab contact={contact} onUpdate={onUpdate} />
            </TabsContent>
            
            <TabsContent value="enquiry" className="mt-6">
              <EnquiryDetailsTab contact={contact} />
            </TabsContent>
            
            <TabsContent value="communication" className="mt-6">
              <CommunicationTab leadId={contact.id} />
            </TabsContent>
            
            <TabsContent value="documents" className="mt-6">
              <DocumentsTab leadId={contact.id} />
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-6">
              <TransactionsTab leadId={contact.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <LeadForm
            context="agent"
            defaultValues={contact}
            onSuccess={async () => {
              await onUpdate();
              // Refresh contact data
              const { data } = await supabase.from('leads').select('*').eq('id', id).single();
              if (data) setContact(data);
              setEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tab Components
function ContactDetailsTab({ contact, onUpdate }: { contact: any; onUpdate: () => void }) {
  const { updateContact } = useContacts();
  const { toast } = useToast();

  return (
    <div className="grid grid-cols-2 gap-6">
      <section className="space-y-4">
        <h3 className="font-medium">Contact Information</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Name:</strong> {contact.name}</div>
          <div><strong>Email:</strong> {contact.email || '—'}</div>
          <div><strong>Phone:</strong> {contact.phone || '—'}</div>
          <div><strong>Source:</strong> {contact.source || '—'}</div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium">Status & Tags</h3>
        <div className="space-y-3">
          <div>
            <strong>Contact Status:</strong>
            <Select
              value={contact.contact_status || 'lead'}
              onValueChange={async (value: ContactStatus) => {
                const { error } = await updateContact(contact.id, { contact_status: value });
                if (error) {
                  toast({ title: 'Error', description: error.message, variant: 'destructive' });
                } else {
                  onUpdate();
                  toast({ title: 'Status updated' });
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="active_client">Active Client</SelectItem>
                <SelectItem value="past_client">Past Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <strong>Interest Tags:</strong>
            <div className="mt-1 flex flex-wrap gap-1">
              {(contact.interest_tags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EnquiryDetailsTab({ contact }: { contact: any }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-medium mb-4">Property Requirements</h3>
        <LeadMeta lead={contact} layout="card" />
      </section>
      
      {contact.notes && (
        <section>
          <h3 className="font-medium mb-2">Notes</h3>
          <div className="bg-muted p-3 rounded-md text-sm">
            {contact.notes}
          </div>
        </section>
      )}
    </div>
  );
}

function CommunicationTab({ leadId }: { leadId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivity, setNewActivity] = useState({ type: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    const fetchActivities = async () => {
      const { listActivities } = await import('@/services/activities');
      const { data, error } = await listActivities(leadId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    };
    fetchActivities();
  }, [leadId]);

  const addActivity = async () => {
    if (!newActivity.type || !newActivity.description) return;
    
    const { createActivity } = await import('@/services/activities');
    const { error } = await createActivity(leadId, newActivity);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewActivity({ type: '', description: '' });
      // Refresh activities
      const { listActivities } = await import('@/services/activities');
      const { data } = await listActivities(leadId);
      setActivities(data || []);
      toast({ title: 'Activity added' });
    }
  };

  if (loading) return <div>Loading activities...</div>;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-medium mb-4">Add Activity</h3>
        <div className="space-y-3">
          <Select value={newActivity.type} onValueChange={(value) => setNewActivity(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Activity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Description"
            value={newActivity.description}
            onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
          />
          
          <Button onClick={addActivity} disabled={!newActivity.type || !newActivity.description}>
            Add Activity
          </Button>
        </div>
      </section>

      <section>
        <h3 className="font-medium mb-4">Activity History</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">{activity.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-muted-foreground">{activity.description}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function DocumentsTab({ leadId }: { leadId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchFiles = async () => {
    const { listFiles } = await import('@/services/storage');
    const { data, error } = await listFiles(`${leadId}/`);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [leadId]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    const { uploadFile: upload } = await import('@/services/storage');
    const fileName = `${leadId}/${Date.now()}-${file.name}`;
    const { error } = await upload(fileName, file);
    
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'File uploaded' });
      fetchFiles();
    }
    setUploading(false);
  };

  const deleteFile = async (path: string) => {
    const { deleteFile: deleteFileFromStorage } = await import('@/services/storage');
    const { error } = await deleteFileFromStorage(path);
    
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'File deleted' });
      fetchFiles();
    }
  };

  if (loading) return <div>Loading documents...</div>;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-medium mb-4">Upload Document</h3>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
            disabled={uploading}
          />
          <Button variant="outline" disabled={uploading} asChild>
            <span>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Choose File'}
            </span>
          </Button>
        </label>
      </section>

      <section>
        <h3 className="font-medium mb-4">Documents</h3>
        <div className="space-y-2">
          {files.length === 0 ? (
            <div className="text-sm text-muted-foreground">No documents uploaded.</div>
          ) : (
            files.map(file => (
              <div key={file.name} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium text-sm">{file.name.split('/').pop()}</div>
                  <div className="text-xs text-muted-foreground">
                    {file.metadata?.size ? `${Math.round(file.metadata.size / 1024)} KB` : ''} • 
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteFile(file.name)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TransactionsTab({ leadId }: { leadId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    const { listTransactions } = await import('@/services/transactions');
    const { data, error } = await listTransactions(leadId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [leadId]);

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <h3 className="font-medium">Transactions</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </section>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No transactions recorded.</div>
        ) : (
          transactions.map(transaction => (
            <div key={transaction.id} className="border rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{transaction.type}</div>
                <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                  {transaction.status}
                </Badge>
              </div>
              {transaction.amount && (
                <div className="text-sm">
                  Amount: {transaction.currency || 'AED'} {transaction.amount.toLocaleString()}
                </div>
              )}
              {transaction.notes && (
                <div className="text-sm text-muted-foreground mt-1">{transaction.notes}</div>
              )}
              {transaction.source_of_funds && (
                <div className="text-xs text-muted-foreground mt-2">
                  Source: {transaction.source_of_funds}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <TransactionForm 
          leadId={leadId} 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            fetchTransactions();
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

function TransactionForm({ leadId, onClose, onSuccess }: { 
  leadId: string; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    type: '',
    amount: '',
    currency: 'AED',
    status: 'pending',
    notes: '',
    source_of_funds: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type) return;

    const { createTransaction } = await import('@/services/transactions');
    const { error } = await createTransaction(leadId, {
      ...form,
      amount: form.amount ? Number(form.amount) : undefined,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Transaction added' });
      onSuccess();
    }
  };

  return (
    <div className="border rounded-md p-4 bg-muted/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Add Transaction</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Type *</label>
            <Select value={form.type} onValueChange={(value) => setForm(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={form.status} onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Currency</label>
            <Select value={form.currency} onValueChange={(value) => setForm(prev => ({ ...prev, currency: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Source of Funds</label>
          <Input
            placeholder="e.g., Salary, Investment, etc."
            value={form.source_of_funds}
            onChange={(e) => setForm(prev => ({ ...prev, source_of_funds: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <Input
            placeholder="Additional details"
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={!form.type}>
            Add Transaction
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function DeduplicateDialog({ 
  duplicateGroups, 
  onClose, 
  onMerge 
}: {
  duplicateGroups: any[][];
  onClose: () => void;
  onMerge: (primaryId: string, duplicateIds: string[]) => Promise<void>;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Potential Duplicates</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No potential duplicates found.
            </div>
          ) : (
            duplicateGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">
                  Duplicate Group {groupIndex + 1} ({group.length} contacts)
                </h4>
                
                <div className="space-y-2 mb-4">
                  {group.map((contact, contactIndex) => (
                    <div key={contact.id} className="flex items-center justify-between bg-muted p-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.email} • {contact.phone}
                        </div>
                      </div>
                      {contactIndex === 0 && (
                        <Badge variant="default">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const primary = group[0];
                    const duplicates = group.slice(1);
                    onMerge(primary.id, duplicates.map(d => d.id));
                  }}
                >
                  Merge (Keep First)
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLeadButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) return null;
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        const confirmed = window.confirm('Delete this lead permanently?');
        if (!confirmed) return;
        const { error } = await deleteLead(id);
        if (error) {
          toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
        } else {
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('leads:changed'));
          toast({ title: 'Lead deleted', description: 'The lead has been removed.' });
          onDeleted();
        }
      }}
    >
      Delete
    </Button>
  );
}