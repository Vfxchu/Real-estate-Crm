import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/hooks/useProperties';
import {
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
} from 'lucide-react';

interface WordPressPropertiesSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewProperty?: (property: Property) => void;
}

export const WordPressPropertiesSidebar: React.FC<WordPressPropertiesSidebarProps> = ({
  open,
  onOpenChange,
  onViewProperty,
}) => {
  const { toast } = useToast();
  const [wpProperties, setWpProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadWordPressProperties();
    }
  }, [open]);

  const loadWordPressProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .not('wp_id', 'is', null)
        .order('wp_last_sync_at', { ascending: false });

      if (error) throw error;
      setWpProperties((data as Property[]) || []);
    } catch (error: any) {
      console.error('Error loading WordPress properties:', error);
      toast({
        title: 'Error loading properties',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResync = async (propertyId: string) => {
    setSyncing(propertyId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-wordpress', {
        body: {
          propertyId,
          action: 'update',
          publishStatus: 'publish',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Resync successful',
          description: 'Property updated on WordPress',
        });
        loadWordPressProperties();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Resync error:', error);
      toast({
        title: 'Resync failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncFromWordPress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-from-wordpress');

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sync successful',
          description: `${data.message}`,
        });
        loadWordPressProperties();
        // Trigger properties refresh
        window.dispatchEvent(new CustomEvent('properties:refresh'));
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSync = async (property: Property) => {
    if (!confirm('Remove WordPress sync? The property will remain in your CRM but will not be synced to WordPress anymore.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          wp_id: null,
          wp_slug: null,
          wp_permalink: null,
          wp_sync_status: 'pending',
          wp_sync_error: null,
        })
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: 'Sync removed',
        description: 'Property unlinked from WordPress',
      });
      loadWordPressProperties();
    } catch (error: any) {
      console.error('Error removing sync:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getSyncStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredProperties = wpProperties.filter((property) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      property.title?.toLowerCase().includes(query) ||
      property.address?.toLowerCase().includes(query) ||
      property.permit_number?.toLowerCase().includes(query)
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-xl">WordPress Properties</SheetTitle>
          <SheetDescription>
            Properties synced to WordPress ({wpProperties.length} total)
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search WordPress properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={loadWordPressProperties}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSyncFromWordPress}
              variant="default"
              size="sm"
              disabled={loading}
              className="flex-1"
            >
              <Download className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Import from WP
            </Button>
          </div>
        </div>

        {/* Properties List */}
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="p-6 pt-0 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading properties...
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No properties match your search' : 'No properties synced to WordPress yet'}
              </div>
            ) : (
              filteredProperties.map((property) => (
                <Card key={property.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {property.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {property.address}, {property.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {getSyncStatusIcon(property.wp_sync_status)}
                          <Badge
                            variant="outline"
                            className="text-xs whitespace-nowrap"
                          >
                            {property.wp_sync_status || 'unknown'}
                          </Badge>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Price:</span>{' '}
                          <span className="font-medium">{formatPrice(property.price)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">WP ID:</span>{' '}
                          <span className="font-medium">#{property.wp_id}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Last Sync:</span>{' '}
                          <span className="font-medium text-xs">
                            {formatDate(property.wp_last_sync_at)}
                          </span>
                        </div>
                      </div>

                      {/* Error message */}
                      {property.wp_sync_error && (
                        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                          {property.wp_sync_error}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewProperty?.(property)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        
                        {property.wp_permalink && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(property.wp_permalink, '_blank')}
                            className="flex-1 text-xs"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResync(property.id)}
                          disabled={syncing === property.id}
                          className="text-xs"
                        >
                          {syncing === property.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveSync(property)}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
