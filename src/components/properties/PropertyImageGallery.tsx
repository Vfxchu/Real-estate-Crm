import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyImageGalleryProps {
  images: string[];
  propertyId: string;
}

export const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({ images, propertyId }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load signed URLs for images with robust handling
  useEffect(() => {
    const loadSignedUrls = async () => {
      if (!images || images.length === 0) return;
      
      setLoading(true);
      try {
        const urls: string[] = [];
        
        for (const imageUrl of images) {
          try {
            // Check if it's already a full URL (starts with http)
            if (imageUrl.startsWith('http')) {
              // If it's a Supabase Storage URL for property-images, convert to signed URL
              const publicMatch = imageUrl.match(/\/object\/public\/property-images\/(.+)$/);
              const signMatch = imageUrl.match(/\/object\/sign\/property-images\/(.+)$/);
              const directMatch = imageUrl.match(/\/object\/property-images\/(.+)$/);

              if (signMatch) {
                // Already a signed URL
                urls.push(imageUrl);
              } else if (publicMatch || directMatch) {
                const pathFromUrl = (publicMatch?.[1] || directMatch?.[1]) as string;
                try {
                  const { data, error } = await supabase.storage
                    .from('property-images')
                    .createSignedUrl(pathFromUrl, 3600);
                  if (error || !data) {
                    // Fallback: try propertyId/filename
                    const fileName = pathFromUrl.split('/').pop() as string;
                    const altPath = `${propertyId}/${fileName}`;
                    const { data: altData, error: altErr } = await supabase.storage
                      .from('property-images')
                      .createSignedUrl(altPath, 3600);
                    if (altErr || !altData) {
                      console.warn('Failed to sign from URL path:', pathFromUrl, error);
                      urls.push(imageUrl);
                    } else {
                      urls.push(altData.signedUrl);
                    }
                  } else {
                    urls.push(data.signedUrl);
                  }
                } catch (err) {
                  console.warn('Error signing from URL:', imageUrl, err);
                  urls.push(imageUrl);
                }
              } else {
                // External URL - use as is
                urls.push(imageUrl);
              }
            } else {
              // For storage paths, try to create signed URL
              let path = imageUrl;

              // Normalize the path - remove any 'property-images/' prefix if it exists
              if (path.startsWith('property-images/')) {
                path = path.substring('property-images/'.length);
              }

              // If path is under a shared folder like 'temp/', don't force propertyId prefix
              if (!path.startsWith('temp/') && !path.startsWith(`${propertyId}/`)) {
                path = `${propertyId}/${path}`;
              }
                
              const { data, error } = await supabase.storage
                .from('property-images')
                .createSignedUrl(path, 3600);
                
              if (error || !data) {
                console.warn('Failed to create signed URL for:', path, error);
                // Try the original URL as fallback
                urls.push(imageUrl);
              } else {
                urls.push(data.signedUrl);
              }
            }
          } catch (error) {
            console.warn('Error processing image URL:', imageUrl, error);
            urls.push(imageUrl); // Fallback to original URL
          }
        }
        
        setImageUrls(urls);
      } catch (error: any) {
        console.error('Error loading image URLs:', error);
        toast({
          title: 'Image loading error',
          description: 'Some images may not display correctly',
          variant: 'destructive',
        });
        // Fallback to original URLs
        setImageUrls(images || []);
      } finally {
        setLoading(false);
      }
    };

    loadSignedUrls();
  }, [images, propertyId, toast]);

  // Use signed URLs if available, otherwise fallback to original images
  const displayImages = imageUrls.length > 0 ? imageUrls : images;

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? displayImages.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === imageUrls.length - 1 ? 0 : selectedIndex + 1);
  };

  if (!displayImages || displayImages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No images available
      </div>
    );
  }

  return (
    <>
      {loading && displayImages.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayImages.map((url, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={url}
              alt={`Property image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn('Image failed to load:', url);
              }}
            />
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 border-0">
          <div className="relative bg-black">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-4 w-4" />
            </Button>

            {selectedIndex !== null && (
              <>
                <img
                  src={displayImages[selectedIndex]}
                  alt={`Property image ${selectedIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                  onError={(e) => {
                    console.warn('Lightbox image failed to load:', displayImages[selectedIndex]);
                  }}
                />

                <div className="absolute inset-y-0 left-4 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                </div>

                <div className="absolute inset-y-0 right-4 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
                  {selectedIndex + 1} / {displayImages.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
