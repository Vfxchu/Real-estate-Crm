import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/hooks/useProperties';
import { 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Globe,
  MapPin
} from 'lucide-react';

interface PropertyPortalsViewProps {
  property: Property;
  onUpdate?: () => void;
}

export const PropertyPortalsView: React.FC<PropertyPortalsViewProps> = ({ property, onUpdate }) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const getSyncStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSyncStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Not Synced</Badge>;
    }
  };

  const handleSyncToWordPress = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-wordpress', {
        body: {
          propertyId: property.id,
          action: property.wp_id ? 'update' : 'create',
          publishStatus: 'publish',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sync successful',
          description: 'Property has been synced to WordPress',
        });
        onUpdate?.();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('WordPress sync error:', error);
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync to WordPress',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* WordPress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSyncStatusIcon(property.wp_sync_status)}
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  WordPress
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getSyncStatusBadge(property.wp_sync_status)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Last Sync:</span>{' '}
              <span className="font-medium">{formatDate(property.wp_last_sync_at)}</span>
            </div>
            
            {property.wp_id && (
              <div className="text-sm">
                <span className="text-muted-foreground">WP ID:</span>{' '}
                <span className="font-medium">#{property.wp_id}</span>
              </div>
            )}

            {property.wp_permalink && (
              <div className="text-sm">
                <span className="text-muted-foreground">URL:</span>{' '}
                <a 
                  href={property.wp_permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  View on Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {property.wp_sync_error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                <span className="font-medium">Error:</span> {property.wp_sync_error}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSyncToWordPress}
              disabled={syncing}
              size="sm"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {property.wp_id ? 'Update on WordPress' : 'Publish to WordPress'}
                </>
              )}
            </Button>

            {property.wp_permalink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(property.wp_permalink, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Finder Card - Placeholder */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-lg">Property Finder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Property Finder integration coming soon...
          </p>
          <Button variant="outline" size="sm" className="mt-4" disabled>
            Configure
          </Button>
        </CardContent>
      </Card>

      {/* Bayut Card - Placeholder */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-lg">Bayut</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bayut integration coming soon...
          </p>
          <Button variant="outline" size="sm" className="mt-4" disabled>
            Configure
          </Button>
        </CardContent>
      </Card>

      {/* Google Maps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {property.location_lat && property.location_lng ? (
            <div className="space-y-2">
              <iframe
                src={`https://www.google.com/maps?q=${property.location_lat},${property.location_lng}&output=embed`}
                width="100%"
                height="300"
                style={{ border: 0, borderRadius: '8px' }}
                loading="lazy"
                title="Property Location"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://www.google.com/maps?q=${property.location_lat},${property.location_lng}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Google Maps
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No location data available for this property.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
