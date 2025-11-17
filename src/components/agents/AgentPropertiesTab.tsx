import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Bed, Bath, Square } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatAED } from '@/lib/currency';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  offer_type: string;
  property_type: string;
  status: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  created_at: string;
}

interface AgentPropertiesTabProps {
  agentId: string;
}

export const AgentPropertiesTab: React.FC<AgentPropertiesTabProps> = ({ agentId }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();

    // Real-time subscription
    const channel = supabase
      .channel('agent-properties-tab')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          fetchProperties();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-500',
      pending: 'bg-yellow-500',
      sold: 'bg-blue-500',
      rented: 'bg-purple-500',
      off_market: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties ({properties.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {properties.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No properties assigned yet</p>
        ) : (
          <div className="space-y-4">
            {properties.map(property => (
              <div
                key={property.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{property.title}</h4>
                    <Badge className={getStatusColor(property.status)}>
                      {property.status}
                    </Badge>
                    <Badge variant="outline">
                      {property.offer_type === 'sale' ? 'For Sale' : 'For Rent'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {property.address}, {property.city}, {property.state}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="font-semibold text-primary">
                      {formatAED(property.price)}
                    </div>
                    {property.bedrooms && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Bed className="h-3 w-3" />
                        {property.bedrooms}
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Bath className="h-3 w-3" />
                        {property.bathrooms}
                      </div>
                    )}
                    {property.area_sqft && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Square className="h-3 w-3" />
                        {property.area_sqft} sqft
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Added {formatDistanceToNow(new Date(property.created_at), { addSuffix: true })}</div>
                  <Badge variant="secondary" className="mt-1">{property.property_type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
