import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Property } from "@/hooks/useProperties";
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharePropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SharePropertyDialog: React.FC<SharePropertyDialogProps> = ({
  property,
  open,
  onOpenChange
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!property) return null;

  const shareUrl = `${window.location.origin}/share/property/${property.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Property
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Share this property with clients and colleagues
            </p>
            <div className="flex space-x-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyToClipboard}
                disabled={copied}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={openInNewTab}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Property Preview:</p>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="font-semibold text-sm">{property.title}</p>
              <p className="text-sm text-muted-foreground">{property.address}</p>
              <p className="text-sm font-medium text-primary">
                {new Intl.NumberFormat('en-AE', { 
                  style: 'currency', 
                  currency: 'AED',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(property.price)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};