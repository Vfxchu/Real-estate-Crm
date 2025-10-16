import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import placeholderImage from '@/assets/property-placeholder.jpg';
import { supabase } from "@/integrations/supabase/client";

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
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Resolve to fresh, non-expired URLs (handles Supabase signed/public/direct paths)
  useEffect(() => {
    let isMounted = true;
    const buildUrls = async () => {
      if (!images || images.length === 0) { setImageUrls([]); return; }
      const resolved = await Promise.all((images || []).map(async (img) => {
        try {
          if (!img) return '';
          if (img.startsWith('http')) {
            const match = img.match(/\/storage\/v1\/object\/(sign|public)\/property-images\/([^?]+)/);
            const direct = img.match(/\/storage\/v1\/object\/property-images\/([^?]+)/);
            const pathFromUrl = match ? match[2] : (direct ? direct[1] : null);
            if (!pathFromUrl) return img; // external or non-storage URL
            const { data, error } = await supabase.storage.from('property-images').createSignedUrl(pathFromUrl, 3600);
            if (error || !data) {
              const fileName = pathFromUrl.split('/').pop() || '';
              const altPath = `${propertyId}/${fileName}`;
              const { data: altData } = await supabase.storage.from('property-images').createSignedUrl(altPath, 3600);
              return altData?.signedUrl || img;
            }
            return data.signedUrl;
          } else {
            let path = img.startsWith('property-images/') ? img.substring('property-images/'.length) : img;
            const { data } = await supabase.storage.from('property-images').createSignedUrl(path, 3600);
            return data?.signedUrl || img;
          }
        } catch {
          return img;
        }
      }));
      if (isMounted) setImageUrls(resolved.filter(Boolean));
    };
    buildUrls();
    const refresh = () => buildUrls();
    window.addEventListener('properties:refresh', refresh);
    return () => { isMounted = false; window.removeEventListener('properties:refresh', refresh); };
  }, [images, propertyId]);

  const displayImages = (imageUrls && imageUrls.length > 0) ? imageUrls : (images || []);

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

  const handleImageError = async (index: number) => {
    try {
      const original = images?.[index];
      if (!original) throw new Error('no-image');
      let newUrl = original;
      if (original.startsWith('http')) {
        const match = original.match(/\/storage\/v1\/object\/(sign|public)\/property-images\/([^?]+)/);
        const direct = original.match(/\/storage\/v1\/object\/property-images\/([^?]+)/);
        const pathFromUrl = match ? match[2] : (direct ? direct[1] : null);
        if (pathFromUrl) {
          const { data } = await supabase.storage.from('property-images').createSignedUrl(pathFromUrl, 3600);
          if (!data) {
            const fileName = pathFromUrl.split('/').pop() || '';
            const { data: alt } = await supabase.storage.from('property-images').createSignedUrl(`${propertyId}/${fileName}`, 3600);
            newUrl = alt?.signedUrl || original;
          } else {
            newUrl = data.signedUrl;
          }
        }
      } else {
        const path = original.startsWith('property-images/') ? original.substring('property-images/'.length) : original;
        const { data } = await supabase.storage.from('property-images').createSignedUrl(path, 3600);
        newUrl = data?.signedUrl || original;
      }
      setImageUrls((prev) => {
        const base = prev && prev.length ? prev : (images || []);
        const copy = [...base];
        copy[index] = newUrl;
        return copy;
      });
    } catch {
      setFailedImages(prev => new Set(prev).add(index));
    }
  };
  const FeaturedImage = () => (
    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
      <img 
        src={failedImages.has(0) ? placeholderImage : displayImages[0]} 
        alt={propertyTitle}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => handleImageError(0)}
      />
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
            src={failedImages.has(currentIndex) ? placeholderImage : displayImages[currentIndex]}
            alt={`${propertyTitle} - Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onError={() => handleImageError(currentIndex)}
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
                src={failedImages.has(index) ? placeholderImage : url} 
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => handleImageError(index)}
              />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};