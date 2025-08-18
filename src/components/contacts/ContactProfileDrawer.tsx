import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Edit,
  Eye,
  X
} from 'lucide-react';
import { Lead } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, createSignedUrl, deleteFile, listFiles } from '@/services/storage';
import ContactForm from './ContactForm';
import { format } from 'date-fns';

interface ContactProfileDrawerProps {
  contact: Lead | null;
  open: boolean;
  onClose: () => void;
}

interface ContactFile {
  id: string;
  name: string;
  path: string;
  type: string;
  created_at: string;
  size?: number;
}

export default function ContactProfileDrawer({ contact, open, onClose }: ContactProfileDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Load contact files
  useEffect(() => {
    if (contact?.id) {
      loadFiles();
    }
  }, [contact?.id]);

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
      toast({ 
        title: 'Error', 
        description: 'Failed to load files: ' + error.message, 
        variant: 'destructive' 
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contact?.id || !user?.id) return;

    setUploading(true);
    try {
      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `documents/${user.id}/${contact.id}/general/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await uploadFile(filePath, file);
      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase
        .from('contact_files')
        .insert({
          contact_id: contact.id,
          name: file.name,
          path: filePath,
          type: 'document',
          size: file.size,
        });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'File uploaded successfully' });
      loadFiles();
    } catch (error: any) {
      toast({ 
        title: 'Upload failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleFileDownload = async (file: ContactFile) => {
    try {
      const { data: signedUrl, error } = await createSignedUrl(file.path, 300);
      if (error) throw error;
      if (!signedUrl?.signedUrl) throw new Error('No signed URL received');

      // Open in new window
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
      // Delete from storage
      const { error: storageError } = await deleteFile(file.path);
      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('contact_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'File deleted successfully' });
      loadFiles();
    } catch (error: any) {
      toast({ 
        title: 'Delete failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {contact.name || 'Unknown Contact'}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={contact.contact_status === 'lead' ? 'secondary' : 'default'}>
                  {contact.contact_status}
                </Badge>
                {contact.interest_tags?.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {editMode ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <ContactForm 
                  contact={contact}
                  onSuccess={() => {
                    setEditMode(false);
                    toast({ title: 'Success', description: 'Contact updated successfully' });
                  }}
                  onCancel={() => setEditMode(false)}
                />
              </div>
            </ScrollArea>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-6 border-b flex-shrink-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="enquiry">Enquiry</TabsTrigger>
                  <TabsTrigger value="communication">Communication</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <TabsContent value="details" className="mt-0 space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {contact.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                          {contact.location_address && (
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{contact.location_address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Created {format(new Date(contact.created_at || ''), 'PPP')}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {contact.notes && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Notes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {contact.notes}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="enquiry" className="mt-0 space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Property Requirements</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {contact.segment && (
                            <div className="flex justify-between">
                              <span className="font-medium">Segment:</span>
                              <span className="capitalize">{contact.segment}</span>
                            </div>
                          )}
                          {contact.subtype && (
                            <div className="flex justify-between">
                              <span className="font-medium">Property Type:</span>
                              <span>{contact.subtype}</span>
                            </div>
                          )}
                          {contact.bedrooms && (
                            <div className="flex justify-between">
                              <span className="font-medium">Bedrooms:</span>
                              <span>{contact.bedrooms}</span>
                            </div>
                          )}
                          {contact.budget_sale_band && (
                            <div className="flex justify-between">
                              <span className="font-medium">Sale Budget:</span>
                              <span>{contact.budget_sale_band}</span>
                            </div>
                          )}
                          {contact.budget_rent_band && (
                            <div className="flex justify-between">
                              <span className="font-medium">Rent Budget:</span>
                              <span>{contact.budget_rent_band}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="communication" className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle>Communication History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Communication history will be implemented in a future update.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-0 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Documents</h3>
                        <div>
                          <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                          <Button 
                            size="sm" 
                            disabled={uploading}
                            onClick={() => document.getElementById('file-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Upload'}
                          </Button>
                        </div>
                      </div>

                      {files.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No documents uploaded</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {files.map((file) => (
                            <Card key={file.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{file.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(file.created_at), 'PPP')}
                                        {file.size && ` • ${Math.round(file.size / 1024)}KB`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleFileDownload(file)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleFileDelete(file)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}