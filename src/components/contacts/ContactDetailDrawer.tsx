import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, Mail, MessageSquare, MapPin, Building, Home, Tag, 
  Edit, FileText, Download, Trash2, Coins
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, deleteFile } from '@/services/storage';
import ContactForm from './ContactForm';
import ContactActivitiesTab from './ContactActivitiesTab';
import ContactTasksEventsTab from './ContactTasksEventsTab';
import ContactNotesComposer from './ContactNotesComposer';
import ContactRecentNotes from './ContactRecentNotes';
import ContactDealsSection from './ContactDealsSection';

interface ContactDetailDrawerProps {
  contact: any;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface ContactFile {
  id: string;
  name: string;
  path: string;
  type: string;
  created_at: string;
}

export default function ContactDetailDrawer({ 
  contact, 
  open, 
  onClose, 
  onUpdate 
}: ContactDetailDrawerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleContactUpdated = () => {
    setEditMode(false);
    onUpdate?.();
    loadContactData();
  };

  const loadContactData = async () => {
    if (!contact?.id) return;
    await loadFiles();
  };

  useEffect(() => {
    if (contact?.id && open) {
      loadContactData();
    }
  }, [contact?.id, open]);

  const loadFiles = async () => {
    if (!contact?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('contact_files')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error loading files:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contact?.id) return;

    setUploading(true);
    try {
      const filePath = `contacts/${contact.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await uploadFile('documents', filePath, file);
      
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('contact_files')
        .insert({
          contact_id: contact.id,
          name: file.name,
          path: filePath,
          type: file.type,
          size: file.size,
        });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'File uploaded successfully' });
      await loadFiles();
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

  const handleFileDownload = async (file: ContactFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.path, 300);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFileDelete = async (file: ContactFile) => {
    if (!confirm('Delete this file?')) return;

    try {
      const { error: storageError } = await deleteFile('documents', file.path);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('contact_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'File deleted successfully' });
      await loadContactData();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'lead': return 'secondary';
      case 'active_client': return 'default';
      case 'past_client': return 'outline';
      case 'new': return 'secondary';
      case 'contacted': return 'default';
      case 'qualified': return 'default';
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'outline';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        className={`${isMobile ? 'w-full' : 'w-full sm:max-w-3xl'} p-0 flex flex-col h-full`}
        side="right"
      >
        {/* Header */}
        <SheetHeader className="p-4 sm:p-6 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(contact.name || 'Contact')}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-lg font-semibold">
                  {contact.name || 'Unknown Contact'}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusVariant(contact.contact_status || contact.status)}>
                    {contact.contact_status || contact.status}
                  </Badge>
                  {contact.interest_tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {contact.interest_tags && contact.interest_tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{contact.interest_tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-1 sm:mr-2" />
                  {isMobile ? '' : 'Edit'}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions Bar - Always visible */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {contact.phone && (
              <Button size="sm" variant="outline" onClick={() => window.open(`tel:${contact.phone}`, '_self')}>
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            )}
            {contact.email && (
              <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${contact.email}`, '_blank')}>
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
            )}
            {contact.phone && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => window.open(`https://wa.me/${contact.phone?.replace(/[^\d]/g, '')}`, '_blank')}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {isMobile ? 'WhatsApp' : 'WhatsApp'}
              </Button>
            )}
            
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button size="sm" variant="outline" disabled={uploading} asChild>
                <span>
                  <FileText className="h-3 w-3 mr-1" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                  <TabsTrigger value="tasks-events">Tasks & Events</TabsTrigger>
                  <TabsTrigger value="deals">Deals</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {editMode ? (
                    <ContactForm
                      contact={contact}
                      onSuccess={handleContactUpdated}
                      onCancel={() => setEditMode(false)}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Quick Notes - at top of sidebar */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <ContactRecentNotes contactId={contact.id} />
                        <div className="mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              // Scroll to the notes composer at bottom
                              const notesComposer = document.getElementById('notes-composer');
                              notesComposer?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="w-full"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Add Note
                          </Button>
                        </div>
                      </div>

                      {/* Contact Information Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{contact.email || 'No email'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{contact.phone || 'No phone'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{contact.address || 'No address'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Tag className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm capitalize">{contact.source || 'Unknown'}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Enquiry Information Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Enquiry Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Interest Type</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm capitalize">{contact.category || 'Not specified'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Budget</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Coins className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {contact.budget_min && contact.budget_max 
                                    ? `AED ${contact.budget_min?.toLocaleString()} - ${contact.budget_max?.toLocaleString()}`
                                    : 'Not specified'
                                  }
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{contact.location_address || 'Not specified'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Property Type</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Home className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm capitalize">{contact.subtype || 'Not specified'}</span>
                              </div>
                            </div>
                          </div>
                          {contact.interest_tags && contact.interest_tags.length > 0 && (
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Interest Tags</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contact.interest_tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {contact.notes && (
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                              <p className="text-sm mt-1">{contact.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Files */}
                      {files.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Documents</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {files.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">{file.name}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => handleFileDownload(file)}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleFileDelete(file)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Recent Notes - above notes composer */}
                      <ContactRecentNotes contactId={contact.id} />

                      {/* Notes Composer - at the very end */}
                      <div id="notes-composer">
                        <ContactNotesComposer 
                          contactId={contact.id} 
                          onNoteAdded={handleContactUpdated}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activities" className="space-y-4">
                  <ContactActivitiesTab contactId={contact.id} />
                </TabsContent>

                <TabsContent value="tasks-events" className="space-y-4">
                  <ContactTasksEventsTab contactId={contact.id} />
                </TabsContent>

                <TabsContent value="deals" className="space-y-4">
                  <ContactDealsSection contactId={contact.id} />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}