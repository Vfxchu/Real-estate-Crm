import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, Download, Image, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, deleteFile, createSignedUrl } from '@/services/storage';

interface PropertyFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  created_at: string;
}

interface PropertyFilesSectionProps {
  propertyId: string;
  canEdit: boolean;
  onUpdate?: () => void;
}

export const PropertyFilesSection: React.FC<PropertyFilesSectionProps> = ({
  propertyId,
  canEdit,
  onUpdate
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<PropertyFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propertyId) {
      loadFiles();
    }
  }, [propertyId]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('property_files')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast({
        title: 'Error loading files',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'document' | 'layout') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const bucket = fileType === 'layout' ? 'property-layouts' : 'property-docs';
      const filePath = `${propertyId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await uploadFile(bucket, filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('property_files')
        .insert({
          property_id: propertyId,
          name: file.name,
          path: filePath,
          type: fileType,
          size: file.size
        });

      if (dbError) throw dbError;

      // Log activity
      await supabase.from('activities').insert({
        type: 'file_upload',
        description: `Uploaded ${fileType}: ${file.name}`,
        property_id: propertyId,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

      toast({
        title: 'Success',
        description: `${fileType === 'layout' ? 'Layout' : 'Document'} uploaded successfully`
      });

      loadFiles();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error uploading file:', error);
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

  const handleDeleteFile = async (file: PropertyFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;

    try {
      const bucket = file.type === 'layout' ? 'property-layouts' : 'property-docs';
      
      const { error: storageError } = await deleteFile(bucket, file.path);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('property_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      // Log activity
      await supabase.from('activities').insert({
        type: 'file_delete',
        description: `Deleted ${file.type}: ${file.name}`,
        property_id: propertyId,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

      toast({
        title: 'Success',
        description: 'File deleted successfully'
      });

      loadFiles();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDownloadFile = async (file: PropertyFile) => {
    try {
      const bucket = file.type === 'layout' ? 'property-layouts' : 'property-docs';
      const { data, error } = await createSignedUrl(bucket, file.path, 3600);
      
      if (error || !data) throw new Error('Could not generate download URL');

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const layouts = files.filter(f => f.type === 'layout');
  const documents = files.filter(f => f.type === 'document');

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading files...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Layouts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Floor Plans & Layouts
            </CardTitle>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById('layout-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Layout
              </Button>
            )}
          </div>
          <input
            id="layout-upload"
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => handleFileUpload(e, 'layout')}
          />
        </CardHeader>
        <CardContent>
          {layouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No layouts uploaded yet
            </p>
          ) : (
            <div className="space-y-2">
              {layouts.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadFile(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteFile(file)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents
            </CardTitle>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById('document-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
          <input
            id="document-upload"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,image/*"
            onChange={(e) => handleFileUpload(e, 'document')}
          />
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No documents uploaded yet
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadFile(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteFile(file)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
