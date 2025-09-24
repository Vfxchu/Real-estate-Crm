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
  AlertTriangle
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
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <div className="px-4 sm:px-6 pt-4 border-b flex-shrink-0">
                <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {isMobile ? 'Info' : 'Overview'}
                  </TabsTrigger>
                  <TabsTrigger value="enquiry" className="text-xs sm:text-sm">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {isMobile ? 'Lead' : 'Enquiry'}
                  </TabsTrigger>
                  {!isMobile && (
                    <>
                      <TabsTrigger value="activity" className="text-sm">
                        <Activity className="w-4 h-4 mr-1" />
                        Activity
                      </TabsTrigger>
                      <TabsTrigger value="properties" className="text-sm">
                        <Building className="w-4 h-4 mr-1" />
                        Properties
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="text-sm">
                        <FileText className="w-4 h-4 mr-1" />
                        Documents
                      </TabsTrigger>
                    </>
                  )}
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
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Enquiry Tab */}
                  <TabsContent value="enquiry" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-4 w-4" />
                          Lead Enquiry Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status:</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusVariant(contact.status)}>
                                {contact.status}
                              </Badge>
                              {onEditLead && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onEditLead(contact.id)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View in Leads
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {contact.source && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Source:</span>
                                <span className="font-medium capitalize">{contact.source}</span>
                              </div>
                            )}
                            {contact.priority && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Priority:</span>
                                <Badge variant={contact.priority === 'high' ? 'destructive' : contact.priority === 'medium' ? 'default' : 'outline'} className="text-xs">
                                  {contact.priority}
                                </Badge>
                              </div>
                            )}
                            {contact.category && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Category:</span>
                                <span className="font-medium capitalize">{contact.category}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">
                                {format(new Date(contact.created_at), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                          </div>

                          {contact.interested_in && (
                            <div className="mt-4">
                              <h4 className="font-medium mb-2 text-sm">Interested In</h4>
                              <p className="text-sm text-muted-foreground">{contact.interested_in}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Activity Tab - Desktop only */}
                  {!isMobile && (
                    <TabsContent value="activity" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4" />
                            Activity Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : timeline.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No activities found</p>
                          ) : (
                            <div className="space-y-4">
                              {timeline.slice(0, 10).map((item) => (
                                <div key={item.id} className="flex gap-3 border-l-2 border-muted pl-4 pb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-medium text-sm">{item.title}</h4>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(item.timestamp), 'MMM dd, HH:mm')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {item.type.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                              {timeline.length > 10 && (
                                <p className="text-xs text-center text-muted-foreground">
                                  +{timeline.length - 10} more activities
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Properties Tab - Desktop only */}
                  {!isMobile && (
                    <TabsContent value="properties" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Building className="h-4 w-4" />
                            Linked Properties
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : properties.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No properties linked</p>
                          ) : (
                            <div className="space-y-3">
                              {properties.map((prop) => (
                                <Card key={prop.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-medium text-sm">{prop.properties.title}</h4>
                                        <p className="text-xs text-muted-foreground">{prop.properties.address}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                          <Badge variant="outline" className="text-xs">
                                            {prop.role}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            {prop.properties.status}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium text-sm">
                                          AED {prop.properties.price?.toLocaleString()}
                                        </p>
                                        <Button size="sm" variant="outline" className="mt-2">
                                          <Eye className="h-3 w-3 mr-1" />
                                          View
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Documents Tab - Desktop only */}
                  {!isMobile && (
                    <TabsContent value="documents" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Client Documents
                            </div>
                            <div>
                              <input
                                id="file-upload"
                                type="file"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              />
                              <label htmlFor="file-upload">
                                <Button size="sm" disabled={uploading} asChild>
                                  <span>
                                    <Upload className="h-3 w-3 mr-1" />
                                    {uploading ? 'Uploading...' : 'Upload'}
                                  </span>
                                </Button>
                              </label>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : files.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No documents uploaded</p>
                          ) : (
                            <div className="space-y-2">
                              {files.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/30"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium text-sm">{file.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {format(new Date(file.created_at), 'MMM dd, yyyy')}
                                        {file.tag && (
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            {file.tag}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleFileDownload(file)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleFileDelete(file)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Mobile: Combined More Tab */}
                  {isMobile && (
                    <TabsContent value="more" className="space-y-4 mt-0">
                      {/* Activity Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4" />
                            Recent Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {timeline.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No activities</p>
                          ) : (
                            <div className="space-y-3">
                              {timeline.slice(0, 3).map((item) => (
                                <div key={item.id} className="border-l-2 border-primary pl-3 pb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <Badge variant="outline" className="text-xs">{item.type.replace('_', ' ')}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(item.timestamp), 'MMM dd')}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium">{item.title}</p>
                                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Properties Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Building className="h-4 w-4" />
                            Properties
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {properties.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No properties linked</p>
                          ) : (
                            <div className="space-y-3">
                              {properties.slice(0, 3).map((prop) => (
                                <Card key={prop.id}>
                                  <CardContent className="p-3">
                                    <h4 className="font-medium text-sm truncate">{prop.properties.title}</h4>
                                    <p className="text-xs text-muted-foreground">{prop.properties.address}</p>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="font-medium text-xs">AED {prop.properties.price?.toLocaleString()}</span>
                                      <Badge variant="outline" className="text-xs">{prop.role}</Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Documents Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Documents
                            </div>
                            <div>
                              <input
                                id="mobile-file-upload"
                                type="file"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              />
                              <label htmlFor="mobile-file-upload">
                                <Button size="sm" disabled={uploading} asChild>
                                  <span>
                                    <Upload className="h-3 w-3" />
                                  </span>
                                </Button>
                              </label>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {files.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No documents</p>
                          ) : (
                            <div className="space-y-2">
                              {files.slice(0, 3).map((file) => (
                                <div key={file.id} className="flex items-center justify-between border rounded p-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs truncate">{file.name}</span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFileDownload(file)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {files.length > 3 && (
                                <p className="text-xs text-center text-muted-foreground">
                                  +{files.length - 3} more files
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}