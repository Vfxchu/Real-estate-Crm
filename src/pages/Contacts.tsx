import React, { useEffect, useMemo, useState } from 'react';
import { useContacts, type ContactStatus } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Download, Upload, GitMerge, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type StatusFilter = 'all' | ContactStatus;
const TAGS = ['buyer', 'seller', 'landlord', 'tenant', 'first_time', 'investor'];

export default function Contacts() {
  const { user, profile } = useAuth();
  const { list, updateContact, mergeContacts, potentialDuplicates, toCSV, getActivities } = useContacts();
  const { toast } = useToast();
  
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [tags, setTags] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  
  const dupes = useMemo(() => potentialDuplicates(rows), [rows, potentialDuplicates]);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await list({ q, status, tags, limit: 200 });
    setLoading(false);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    
    setRows(data || []);
  };

  useEffect(() => {
    fetchRows();
  }, [q, status, tags.join('|')]);

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

  const toggleTag = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addTagToContact = async (contactId: string, tag: string) => {
    const contact = rows.find(r => r.id === contactId);
    if (!contact) return;
    
    const newTags = [...new Set([...(contact.tags || []), tag])];
    const { error } = await updateContact(contactId, { tags: newTags });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchRows();
      toast({ title: 'Tag added', description: `Added "${tag}" tag` });
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Contacts</h1>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
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
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, email, or phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {(['all', 'lead', 'active_client', 'past_client'] as StatusFilter[]).map(s => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Tags:</span>
          {TAGS.map(tag => (
            <Button
              key={tag}
              variant={tags.includes(tag) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleTag(tag)}
            >
              {tag.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-muted px-4 py-3 text-sm font-medium">
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
          <div>Phone</div>
          <div>Email</div>
          <div>Contact Status</div>
          <div>Tags</div>
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
              className="grid grid-cols-8 px-4 py-3 border-t hover:bg-accent/50 cursor-pointer"
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
              <div>{row.phone}</div>
              <div>{row.email}</div>
              
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
              
              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                {(row.tags || []).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={() => addTagToContact(row.id, 'buyer')}
                >
                  +buyer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={() => addTagToContact(row.id, 'seller')}
                >
                  +seller
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}
              </div>
              
              <div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact Drawer */}
      {drawerId && (
        <ContactDrawer 
          id={drawerId} 
          onClose={() => setDrawerId(null)}
          onUpdate={fetchRows}
        />
      )}

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
  const { updateContact, getActivities } = useContacts();
  const { toast } = useToast();
  const [contact, setContact] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data: activitiesData } = await getActivities(id);
      
      setContact(contactData);
      setActivities(activitiesData || []);
      setLoading(false);
    };

    fetchContact();
  }, [id]);

  if (loading || !contact) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-background p-6 rounded-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex">
      <div className="ml-auto h-full w-full max-w-4xl bg-background overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{contact.name}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {/* Contact Info */}
            <section className="space-y-4">
              <h3 className="font-medium">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Email:</strong> {contact.email || '—'}</div>
                <div><strong>Phone:</strong> {contact.phone || '—'}</div>
                <div>
                  <strong>Status:</strong>
                  <Select
                    value={contact.contact_status || 'lead'}
                    onValueChange={async (value: ContactStatus) => {
                      const { error } = await updateContact(contact.id, { contact_status: value });
                      if (error) {
                        toast({ title: 'Error', description: error.message, variant: 'destructive' });
                      } else {
                        setContact({ ...contact, contact_status: value });
                        onUpdate();
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
                  <strong>Tags:</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(contact.tags || []).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Activity History */}
            <section>
              <h3 className="font-medium mb-4">Activity History</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No activity yet.</div>
                ) : (
                  activities.map(activity => (
                    <div key={activity.id} className="border rounded-md p-3 text-sm">
                      <div className="font-medium">{activity.type}</div>
                      <div className="text-muted-foreground mt-1">{activity.description}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Custom Fields */}
            <section>
              <h3 className="font-medium mb-4">Custom Fields</h3>
              <CustomFieldsEditor 
                id={contact.id} 
                initial={contact.custom_fields || {}}
                onUpdate={() => {
                  onUpdate();
                  // Refresh contact data
                  supabase.from('leads').select('*').eq('id', id).single().then(({ data }) => {
                    if (data) setContact(data);
                  });
                }}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomFieldsEditor({ 
  id, 
  initial, 
  onUpdate 
}: { 
  id: string; 
  initial: Record<string, any>;
  onUpdate: () => void;
}) {
  const { updateContact } = useContacts();
  const { toast } = useToast();
  const [pairs, setPairs] = useState<[string, string][]>(
    Object.entries(initial || {}).map(([k, v]) => [k, String(v)])
  );

  const save = async () => {
    const customFields: Record<string, any> = {};
    for (const [key, value] of pairs) {
      if (key.trim()) {
        customFields[key.trim()] = value;
      }
    }
    
    const { error } = await updateContact(id, { custom_fields: customFields });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Custom fields updated' });
      onUpdate();
    }
  };

  const addField = () => {
    setPairs([...pairs, ['', '']]);
  };

  const removeField = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {pairs.map((pair, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder="Field name"
            value={pair[0]}
            onChange={(e) => {
              const newPairs = [...pairs];
              newPairs[index] = [e.target.value, pair[1]];
              setPairs(newPairs);
            }}
            className="flex-1"
          />
          <Input
            placeholder="Value"
            value={pair[1]}
            onChange={(e) => {
              const newPairs = [...pairs];
              newPairs[index] = [pair[0], e.target.value];
              setPairs(newPairs);
            }}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={() => removeField(index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
        <Button size="sm" onClick={save}>
          Save Fields
        </Button>
      </div>
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

// Import supabase client for drawer functionality
import { supabase } from '@/integrations/supabase/client';