import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, Download, Image, File, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, deleteFile } from '@/services/storage';
import { getPropertyFileUrl } from '@/services/propertyFiles';
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
        .eq('type', 'document')  // Only show documents, not layouts
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, DOC, DOCX, and image files are allowed for documents.',
        variant: 'destructive'
      });
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Please sign in to upload files');
      }

      const bucket = 'property-docs';
      const filePath = `${propertyId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await uploadFile(bucket, filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('property_files')
        .insert({
          property_id: propertyId,
          name: file.name,
          path: filePath,
          type: 'document',
          size: file.size,
          created_by: user.id
        });

      if (dbError) throw dbError;

      // Log activity
      await supabase.from('activities').insert({
        type: 'file_upload',
        description: `Uploaded document: ${file.name}`,
        property_id: propertyId,
        created_by: user.id
      });

      toast({
        title: 'Success',
        description: 'Document uploaded successfully'
      });

      // Reload files to show the new upload
      await loadFiles();
      
      // Only call onUpdate if provided (optional callback)
      // Do NOT trigger parent form submission
      if (onUpdate) {
        onUpdate();
      }
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
      const bucket = 'property-docs';
      
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
        description: `Deleted document: ${file.name}`,
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
      const url = await getPropertyFileUrl({ ...file, property_id: propertyId, type: 'document' } as any);
      window.open(url, '_blank');
    } catch (error: any) {
      const message = error.status === 403 
        ? "You don't have access to this file"
        : error.status === 404
        ? "File not found. It may have been moved or deleted"
        : error.message || "Could not generate download URL";
      
      toast({
        title: "Download Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleViewFile = async (file: PropertyFile) => {
    try {
      const url = await getPropertyFileUrl({ ...file, property_id: propertyId, type: 'document' } as any);
      window.open(url, '_blank');
    } catch (error: any) {
      const message = error.status === 403 
        ? "You don't have access to this file"
        : error.status === 404
        ? "File not found. It may have been moved or deleted"
        : error.message || "Could not generate view URL";
      
      toast({
        title: "View Failed",
        description: message,
        variant: "destructive",
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </CardTitle>
          {canEdit && (
            <Button
              type="button"
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
          onChange={handleFileUpload}
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
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewFile(file)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownloadFile(file)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      type="button"
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
  );
};
