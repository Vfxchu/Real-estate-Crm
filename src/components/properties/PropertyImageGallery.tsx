import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PropertyImageGalleryProps {
  images: string[];
  propertyId: string;
}

export const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({ images, propertyId }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Load image URLs when component mounts
  React.useEffect(() => {
    const loadImages = async () => {
      const urls = await Promise.all(
        images.map(async (path) => {
          try {
            const { data } = await supabase.storage
              .from('property-images')
              .createSignedUrl(path, 3600);
            return data?.signedUrl || '';
          } catch (error) {
            console.error('Error loading image:', error);
            return '';
          }
        })
      );
      setImageUrls(urls.filter(url => url));
    };

    if (images && images.length > 0) {
      loadImages();
    }
  }, [images]);

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? imageUrls.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === imageUrls.length - 1 ? 0 : selectedIndex + 1);
  };

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No images available
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {imageUrls.map((url, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={url}
              alt={`Property image ${index + 1}`}
              className="w-full h-full object-cover"
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
                  src={imageUrls[selectedIndex]}
                  alt={`Property image ${selectedIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
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
                  {selectedIndex + 1} / {imageUrls.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
