import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { getSecureImageUrl } from '@/services/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyGalleryProps {
  images: string[] | null | undefined;
  propertyId: string;
  propertyTitle: string;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({ 
  images, 
  propertyId, 
  propertyTitle 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load signed URLs for images
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
              // If it's a Supabase Storage URL for property-images, convert to signed URL (bucket is private)
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
                    console.warn('Failed to sign from URL path:', pathFromUrl, error);
                    urls.push(imageUrl);
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
                .createSignedUrl(path, 3600); // 1 hour expiry
                
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
        
        setSignedUrls(urls);
      } catch (error: any) {
        console.error('Error loading image URLs:', error);
        toast({
          title: 'Image loading error',
          description: 'Some images may not display correctly',
          variant: 'destructive',
        });
        // Fallback to original URLs
        setSignedUrls(images || []);
      } finally {
        setLoading(false);
      }
    };

    loadSignedUrls();
  }, [images, propertyId, toast]);

  const displayImages = signedUrls.length > 0 ? signedUrls : (images || []);

  if (!displayImages || displayImages.length === 0) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <ImageIcon className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const FeaturedImage = () => (
    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <img 
          src={displayImages[0]} 
          alt={propertyTitle}
          className="w-full h-full object-cover"
          onError={() => {
            console.warn('Image failed to load:', displayImages[0]);
          }}
        />
      )}
      {displayImages.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          +{displayImages.length - 1} more
        </div>
      )}
    </div>
  );

  if (displayImages.length === 1) {
    return <FeaturedImage />;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <FeaturedImage />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh]">
        <div className="relative h-full flex items-center justify-center bg-black/90 rounded">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={prevImage}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <img
            src={displayImages[currentIndex]}
            alt={`${propertyTitle} - Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.warn('Gallery image failed to load:', displayImages[currentIndex]);
            }}
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={nextImage}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
            {currentIndex + 1} / {displayImages.length}
          </div>
        </div>
        
        {/* Thumbnail strip */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4">
          {displayImages.map((url, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                index === currentIndex ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img 
                src={url} 
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};