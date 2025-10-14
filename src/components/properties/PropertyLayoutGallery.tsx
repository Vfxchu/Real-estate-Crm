import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trash2, Download, Image, File, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPropertyFileUrl } from '@/services/propertyFiles';
import propertyPlaceholder from '@/assets/property-placeholder.jpg';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  canDownload?: boolean;
  onUpdate?: () => void;
}

export const PropertyLayoutGallery: React.FC<PropertyLayoutGalleryProps> = ({
  propertyId,
  canEdit = false,
  canDownload = true,
  onUpdate
}) => {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<PropertyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (propertyId) {
      loadLayouts();
    }
  }, [propertyId]);

  // Listen for real-time updates to property files
  useEffect(() => {
    if (!propertyId) return;

    const channel = supabase
      .channel(`property-files-${propertyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_files',
        filter: `property_id=eq.${propertyId}`
      }, (payload) => {
        console.log('Property files changed:', payload);
        loadLayouts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  const loadLayouts = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('property_files')
        .select('*')
        .eq('property_id', propertyId)
        .eq('type', 'layout')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const files = data || [];
      setLayouts(files);

      // Only fetch signed URLs if canDownload is true
      if (canDownload && files.length > 0) {
        const urls: Record<string, string> = {};
        for (const file of files) {
          try {
            const url = await getPropertyFileUrl(file as any);
            if (url) {
              urls[file.id] = url;
            }
          } catch (err: any) {
            console.error(`Failed to generate URL for file ${file.id}:`, err);
          }
        }
        setSignedUrls(urls);
      }
    } catch (error: any) {
      console.error('Error loading layouts:', error);
      setError(error.message || 'Failed to load floor plans');
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message?.includes('network') || error.message?.includes('fetch'))) {
        setTimeout(() => loadLayouts(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        toast({
          title: 'Error loading layouts',
          description: error.message || 'Please try again',
          variant: 'destructive'
        });
      }
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
    if (!canDownload) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to download files from this property.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = await getPropertyFileUrl(file as any);
      window.open(url, '_blank');
      
      toast({
        title: "Download Started",
        description: `Downloading ${file.name}`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      const statusCode = error.status || 500;
      let errorMessage = "Failed to download file. Please try again.";
      
      if (statusCode === 403) {
        errorMessage = "You don't have access to this file.";
      } else if (statusCode === 404) {
        errorMessage = "File not found. It may have been deleted.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive",
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

  if (error && layouts.length === 0) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadLayouts()} 
            className="mt-2 ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
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
    <TooltipProvider>
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
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
                      onClick={() => canDownload && handleDownloadFile(file)}
                      onError={(e) => {
                        e.currentTarget.src = propertyPlaceholder;
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {canDownload ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Not permitted for this property</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
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
                    {canDownload ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              <Download className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Not permitted for this property</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
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
      </div>
    </TooltipProvider>
  );
};
