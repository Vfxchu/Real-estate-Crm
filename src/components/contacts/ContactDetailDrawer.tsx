import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Edit, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Activity, 
  Building, 
  FileText, 
  Download, 
  Upload,
  MessageSquare,
  Eye,
  AlertTriangle,
  Handshake
} from 'lucide-react';
import { Lead } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, createSignedUrl, deleteFile } from '@/services/storage';
import { format } from 'date-fns';
import UnifiedContactForm from '@/components/forms/UnifiedContactForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { getContactTimeline, type TimelineItem } from '@/services/contacts';
import ContactNotesComposer from './ContactNotesComposer';
import ContactRecentNotes from './ContactRecentNotes';
import ContactDealsSection from './ContactDealsSection';

interface ContactDetailDrawerProps {
  contact: Lead | null;
  open: boolean;
  onClose: () => void;
  onEditLead?: (leadId: string) => void;
}

interface ContactFile {
  id: string;
  name: string;
  path: string;
  type: string;
  tag?: string;
  created_at: string;
}

interface ContactProperty {
  id: string;
  property_id: string;
  role: string;
  created_at: string;
  properties: {
    title: string;
    address: string;
    price: number;
    status: string;
    property_type: string;
  };
}

interface ContactActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by: string;
}

export default function ContactDetailDrawer({ 
  contact, 
  open, 
  onClose, 
  onEditLead 
}: ContactDetailDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [properties, setProperties] = useState<ContactProperty[]>([]);
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact?.id && open) {
      loadContactData();
    }
  }, [contact?.id, open]);

  const loadContactData = async () => {
    if (!contact?.id) return;
    
    setLoading(true);
    try {
      // Load files
      const { data: filesData, error: filesError } = await supabase
        .from('contact_files')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;
      setFiles(filesData || []);

      // Load linked properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('contact_properties')
        .select(`
          *,
          properties!inner(
            title,
            address,
            price,
            status,
            property_type
          )
        `)
        .eq('contact_id', contact.id);

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData as ContactProperty[] || []);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load unified timeline
      const { data: timelineData, error: timelineError } = await getContactTimeline(contact.id);
      if (timelineError) throw timelineError;
      setTimeline(timelineData || []);

    } catch (error: any) {
      console.error('Failed to load contact data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact data: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contact?.id || !user?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `documents/${user.id}/${contact.id}/general/${fileName}`;

      const { error: uploadError } = await uploadFile('documents', filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('contact_files').insert({
        contact_id: contact.id,
        name: file.name,
        path: filePath,
        type: 'document',
        tag: 'other'
      });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'File uploaded successfully' });
      await loadContactData();
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
      const { data: signedUrl, error } = await createSignedUrl('documents', file.path, 300);
      if (error) throw error;
      if (!signedUrl?.signedUrl) throw new Error('No signed URL received');
      window.open(signedUrl.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFileDelete = async (file: ContactFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

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
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
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
            {contact.phone && (
              <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${contact.phone?.replace(/\D/g, '')}`, '_blank')}>
                <MessageSquare className="h-3 w-3 mr-1" />
                WhatsApp
              </Button>
            )}
            {contact.email && (
              <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${contact.email}`, '_blank')}>
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {editMode ? (
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6">
                <UnifiedContactForm
                  contact={contact}
                  mode="contact"
                  onSuccess={() => {
                    setEditMode(false);
                    toast({ title: 'Success', description: 'Contact updated successfully' });
                    loadContactData();
                    window.dispatchEvent(new CustomEvent('contacts:updated'));
                    window.dispatchEvent(new CustomEvent('leads:changed'));
                  }}
                  onCancel={() => setEditMode(false)}
                />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Notes Composer - Always at top */}
              <div className="p-4 sm:p-6 border-b flex-shrink-0">
                <ContactNotesComposer 
                  contactId={contact.id} 
                  onNoteAdded={loadContactData}
                />
              </div>

              {/* Deals Section */}
              <div className="p-4 sm:p-6 border-b flex-shrink-0">
                <ContactDealsSection contactId={contact.id} />
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <div className="px-4 sm:px-6 pt-4 border-b flex-shrink-0">
                  <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      {isMobile ? 'Info' : 'Overview'}
                    </TabsTrigger>
                    <TabsTrigger value="activities" className="text-xs sm:text-sm">
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      {isMobile ? 'Activity' : 'Activities'}
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs sm:text-sm">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      {isMobile ? 'Tasks' : 'Tasks & Events'}
                    </TabsTrigger>
                    <TabsTrigger value="deals" className="text-xs sm:text-sm">
                      <Handshake className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Deals
                    </TabsTrigger>
                    {isMobile && (
                      <TabsTrigger value="more" className="text-xs">
                        More
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 sm:p-6">
                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-4 w-4" />
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {contact.phone && (
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{contact.phone}</span>
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{contact.email}</span>
                                </div>
                              )}
                              {contact.location_address && (
                                <div className="flex items-center gap-3">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{contact.location_address}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  Created {format(new Date(contact.created_at), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>

                            {/* Client Address - NEW FIELD */}
                            {(contact as any)?.client_address && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-2 text-sm">Client Address</h4>
                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                                  {(contact as any).client_address}
                                </p>
                              </div>
                            )}

                            {/* Enquiry Details - Merged into Overview */}
                            {(contact.interested_in || contact.budget_range || contact.segment || contact.subtype) && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-3 text-sm">Enquiry Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded">
                                  {contact.interested_in && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Interest:</span>
                                      <span className="font-medium">{contact.interested_in}</span>
                                    </div>
                                  )}
                                  {contact.budget_range && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Budget:</span>
                                      <span className="font-medium">{contact.budget_range}</span>
                                    </div>
                                  )}
                                  {contact.category && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Category:</span>
                                      <span className="font-medium capitalize">{contact.category}</span>
                                    </div>
                                  )}
                                  {contact.source && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Source:</span>
                                      <span className="font-medium capitalize">{contact.source}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Property Requirements */}
                            {(contact.segment || contact.subtype || contact.bedrooms || contact.budget_sale_band || contact.budget_rent_band) && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-3 text-sm">Property Requirements</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {contact.segment && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Segment:</span>
                                      <span className="capitalize font-medium">{contact.segment}</span>
                                    </div>
                                  )}
                                  {contact.subtype && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Type:</span>
                                      <span className="font-medium">{contact.subtype}</span>
                                    </div>
                                  )}
                                  {contact.bedrooms && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Bedrooms:</span>
                                      <span className="font-medium">{contact.bedrooms}</span>
                                    </div>
                                  )}
                                  {contact.budget_sale_band && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Sale Budget:</span>
                                      <span className="font-medium">{contact.budget_sale_band}</span>
                                    </div>
                                  )}
                                  {contact.budget_rent_band && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Rent Budget:</span>
                                      <span className="font-medium">{contact.budget_rent_band}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {contact.notes && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-2 text-sm">Notes</h4>
                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                                  {contact.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Recent Notes */}
                          <div className="mt-6">
                            <ContactRecentNotes contactId={contact.id} />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Activities Tab */}
                    <TabsContent value="activities" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4" />
                            Activity Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {timeline.length > 0 ? (
                            <div className="space-y-4">
                              {timeline.map((item) => (
                                <div key={`${item.type}-${item.id}`} className="flex gap-3 pb-3 border-b last:border-b-0">
                                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium capitalize">{item.type.replace('_', ' ')}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{item.details || item.type}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p className="text-sm">No activities yet</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Tasks & Events Tab */}
                    <TabsContent value="tasks" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4" />
                            Tasks & Events
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Calendar integration coming soon...</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Deals Tab */}
                    <TabsContent value="deals" className="space-y-6 mt-0">
                      <ContactDealsSection contactId={contact.id} />
                    </TabsContent>

                    {/* Mobile More Tab */}
                    {isMobile && (
                      <TabsContent value="more" className="space-y-6 mt-0">
                        <div className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Building className="h-4 w-4" />
                                Properties
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {properties.length > 0 ? (
                                <div className="space-y-3">
                                  {properties.map((prop) => (
                                    <div key={prop.id} className="p-3 border rounded-lg">
                                      <p className="font-medium text-sm">{prop.properties.title}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{prop.properties.address}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {prop.role.replace('_', ' ')}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          {prop.properties.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No linked properties</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}