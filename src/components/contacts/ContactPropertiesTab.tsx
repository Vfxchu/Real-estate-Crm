import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Unlink, MapPin, Bed, Bath, Square, Home, Building, Eye } from "lucide-react";
import { getContactProperties, linkPropertyToContact, unlinkPropertyFromContact, ContactPropertyRole, resolveRelatedContactIds } from "@/services/contacts";
import { useProperties, Property } from "@/hooks/useProperties";
import { toast } from "@/hooks/use-toast";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { PropertyGallery } from "@/components/properties/PropertyGallery";

// Format currency helper
const formatCurrency = (amount: number, currency = 'AED') => {
  if (currency === 'AED') {
    return new Intl.NumberFormat('en-AE', { 
      style: 'currency', 
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

interface ContactPropertiesTabProps {
  contactId: string;
}

export function ContactPropertiesTab({ contactId }: ContactPropertiesTabProps) {
  const navigate = useNavigate();
  const [contactProperties, setContactProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ContactPropertyRole>('buyer_interest');
  const [relatedContactIds, setRelatedContactIds] = useState<string[]>([contactId]);
  
  const { properties } = useProperties();

  // Listen for property changes to refresh the list
  useSync({
    onPropertiesChange: () => {
      console.log('[ContactPropertiesTab] Properties changed, reloading...');
      loadContactProperties();
    },
    onContactsChange: () => {
      console.log('[ContactPropertiesTab] Contacts changed, reloading...');
      loadContactProperties();
    }
  });

  // Load related contact IDs and properties on mount
  useEffect(() => {
    const loadRelatedIds = async () => {
      const ids = await resolveRelatedContactIds(contactId);
      setRelatedContactIds(ids);
    };
    loadRelatedIds();
    loadContactProperties();
  }, [contactId]);

  // Set up real-time subscriptions for ALL related contact IDs
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Subscribe to changes for each related contact ID
    relatedContactIds.forEach((id) => {
      const channel = supabase
        .channel(`contact-properties-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contact_properties',
            filter: `contact_id=eq.${id}`
          },
          (payload) => {
            console.log('[ContactPropertiesTab] Real-time change for', id, ':', payload);
            loadContactProperties();
          }
        )
        .subscribe();
      
      channels.push(channel);
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [relatedContactIds]);

  const loadContactProperties = async () => {
    try {
      const { data, error } = await getContactProperties(contactId);
      if (error) {
        console.error('[ContactPropertiesTab] Failed to load properties:', error);
        toast({
          title: "Error loading properties",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('[ContactPropertiesTab] Loaded properties:', data);
        setContactProperties(data || []);
      }
    } catch (error: any) {
      console.error('[ContactPropertiesTab] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load contact properties",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleLinkProperty = async () => {
    if (!selectedProperty) return;
    
    try {
      console.log('[ContactPropertiesTab] Linking property:', { contactId, propertyId: selectedProperty, role: selectedRole });
      const { error } = await linkPropertyToContact({
        contactId,
        propertyId: selectedProperty,
        role: selectedRole
      });
      
      if (error) {
        console.error('[ContactPropertiesTab] Link error:', error);
        throw error;
      }
      
      toast({
        title: "Property Linked",
        description: "Property has been linked to this contact",
      });
      
      setShowLinkDialog(false);
      setSelectedProperty('');
      
      // Dispatch event for cross-app sync
      window.dispatchEvent(new CustomEvent('properties:refresh'));
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      
      loadContactProperties();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link property",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkProperty = async (propertyId: string, role: ContactPropertyRole) => {
    try {
      await unlinkPropertyFromContact({
        contactId,
        propertyId,
        role
      });
      
      toast({
        title: "Property Unlinked",
        description: "Property has been unlinked from this contact",
      });

      // Dispatch events for cross-app sync
      window.dispatchEvent(new CustomEvent('properties:refresh'));
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      
      loadContactProperties();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink property",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'sold': return 'bg-info text-info-foreground';
      case 'off_market': return 'bg-muted text-muted-foreground';
      case 'rented': return 'bg-info text-info-foreground';
      case 'vacant': return 'bg-muted text-muted-foreground';
      case 'in_development': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'house': return <Home className="w-4 h-4" />;
      case 'condo': return <Building className="w-4 h-4" />;
      case 'apartment': return <Building className="w-4 h-4" />;
      case 'commercial': return <Building className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'buyer_interest':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'tenant':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'investor':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'buyer_interest':
        return 'Buyer Interest';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const availableProperties = properties.filter(
    prop => !contactProperties.some(cp => cp.property_id === prop.id)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Properties</h3>
        
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Link Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Property to Contact</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="property">Select Property</Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="role">Relationship Type</Label>
                <Select value={selectedRole} onValueChange={(value: ContactPropertyRole) => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="buyer_interest">Buyer Interest</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLinkProperty} disabled={!selectedProperty}>
                  Link Property
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contactProperties.map((item) => {
          const property = item.properties;
          return (
            <Card key={`${item.property_id}-${item.role}`} className="card-elevated hover:shadow-lg transition-all duration-200 overflow-hidden">
              <div className="relative">
                <PropertyGallery 
                  images={property.images} 
                  propertyId={property.id}
                  propertyTitle={property.title}
                />
                {property.featured && (
                  <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                    Featured
                  </Badge>
                )}
                <Badge className={`absolute top-2 left-2 ${getRoleColor(item.role)}`}>
                  {getRoleLabel(item.role)}
                </Badge>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {property.address}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(property.status)}>
                      {property.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {property.offer_type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getTypeIcon(property.property_type)}
                    <span className="text-sm capitalize">{property.property_type}</span>
                    {property.subtype && (
                      <span className="text-xs text-muted-foreground">• {property.subtype}</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(property.price)}
                  </div>
                </div>

                {property.property_type !== 'commercial' && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Square className="w-4 h-4" />
                      <span>{property.area_sqft?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/properties?id=${item.property_id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleUnlinkProperty(item.property_id, item.role)}
                    title="Unlink property from contact"
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {contactProperties.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No properties linked yet</p>
            <p className="text-sm mt-2">Use the "Link Property" button to connect properties to this contact</p>
          </div>
        )}
      </div>
    </div>
  );
}