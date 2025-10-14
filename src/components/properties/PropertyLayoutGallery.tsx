import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trash2, Download, Image, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPropertyFileUrl } from '@/services/propertyFiles';
import propertyPlaceholder from '@/assets/property-placeholder.jpg';

interface PropertyFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  created_at: string;
}

interface PropertyLayoutGalleryProps {
  propertyId: string;
  canEdit?: boolean;
  onUpdate?: () => void;
}

export const PropertyLayoutGallery: React.FC<PropertyLayoutGalleryProps> = ({
  propertyId,
  canEdit = false,
  onUpdate
}) => {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<PropertyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (propertyId) {
      loadLayouts();
    }
  }, [propertyId]);

  const loadLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('property_files')
        .select('*')
        .eq('property_id', propertyId)
        .eq('type', 'layout')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const files = data || [];
      setLayouts(files);

      const urls: Record<string, string> = {};
      for (const file of files) {
        const url = await getPropertyFileUrl(file as any);
        if (url) {
          urls[file.id] = url;
        }
      }
      setSignedUrls(urls);
    } catch (error: any) {
      console.error('Error loading layouts:', error);
      toast({
        title: 'Error loading layouts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (file: PropertyFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('property-layouts')
        .remove([file.path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('property_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activities').insert({
          type: 'file_delete',
          description: `Deleted floor plan: ${file.name}`,
          property_id: propertyId,
          created_by: user.id
        });
      }

      toast({
        title: 'Success',
        description: 'Floor plan deleted successfully'
      });

      loadLayouts();
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
      const url = signedUrls[file.id] || await getPropertyFileUrl(file as any);
      if (!url) throw new Error('Could not generate download URL');
      window.open(url, '_blank');
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

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
  };

  const isPdfFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading floor plans...
      </div>
    );
  }

  if (layouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No floor plans or layouts uploaded.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {layouts.map((file) => {
        const isImage = isImageFile(file.name);
        const isPdf = isPdfFile(file.name);
        const signedUrl = signedUrls[file.id];

        if (isImage && signedUrl) {
          // Image thumbnail with lightbox
          return (
            <div key={file.id} className="relative group">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                <img
                  src={signedUrl}
                  alt={file.name}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleDownloadFile(file)}
                  onError={(e) => {
                    e.currentTarget.src = propertyPlaceholder;
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownloadFile(file)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteFile(file)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {file.name}
              </p>
            </div>
          );
        } else {
          // PDF or unknown file card
          return (
            <div key={file.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded">
                  {isPdf ? (
                    <FileText className="w-6 h-6 text-primary" />
                  ) : (
                    <File className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size ? formatFileSize(file.size) : 'Unknown size'} • {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDownloadFile(file)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  View
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
          );
        }
      })}
    </div>
  );
};
