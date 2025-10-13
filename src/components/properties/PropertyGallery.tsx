import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import placeholderImage from '@/assets/property-placeholder.jpg';

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

  // Images are already signed URLs from useProperties hook
  const displayImages = images || [];

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

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  const FeaturedImage = () => (
    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
      <img 
        src={failedImages.has(0) ? placeholderImage : displayImages[0]} 
        alt={propertyTitle}
        className="w-full h-full object-cover"
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
                onError={() => handleImageError(index)}
              />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};