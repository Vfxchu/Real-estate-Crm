import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, Mail, MessageSquare, MapPin, Building, Edit, X,
  Bed, Bath, Square, Calendar, FileText, Activity, DollarSign,
  Home, Eye, Share2
} from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Property } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";
import { PropertyFilesSection } from "./PropertyFilesSection";

export interface PropertyWithOwner extends Property {
  owner?: {
    name: string;
    phone?: string;
    email?: string;
  } | null;
}

interface PropertyDetailDrawerProps {
  property: PropertyWithOwner | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onUpdate?: () => void;
}

interface PropertyActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by: string;
  profiles?: { name: string; email: string };
}

export const PropertyDetailDrawer: React.FC<PropertyDetailDrawerProps> = ({
  property,
  open,
  onClose,
  onEdit,
  onUpdate
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<PropertyActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const canEdit = isAdmin || property?.agent_id === user?.id;

  useEffect(() => {
    if (property?.id && open) {
      loadActivities();
    }
  }, [property?.id, open]);

  const loadActivities = async () => {
    if (!property?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          description,
          created_at,
          created_by,
          profiles:created_by(name, email)
        `)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      console.error('Error loading activities:', error);
    }
  };

  const handleWhatsApp = () => {
    if (!property?.owner?.phone) {
      toast({
        title: "No phone number",
        description: "Owner contact doesn't have a phone number",
        variant: "destructive"
      });
      return;
    }
    window.open(`https://wa.me/${property.owner.phone.replace(/\D/g, '')}`, '_blank');
  };

  const handleCall = () => {
    if (!property?.owner?.phone) {
      toast({
        title: "No phone number",
        description: "Owner contact doesn't have a phone number",
        variant: "destructive"
      });
      return;
    }
    window.location.href = `tel:${property.owner.phone}`;
  };

  const handleEmail = () => {
    if (!property?.owner?.email) {
      toast({
        title: "No email",
        description: "Owner contact doesn't have an email",
        variant: "destructive"
      });
      return;
    }
    window.location.href = `mailto:${property.owner.email}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-500',
      pending: 'bg-yellow-500',
      sold: 'bg-blue-500',
      rented: 'bg-purple-500',
      off_market: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (!property) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {/* Header */}
            <SheetHeader className="space-y-4 pb-6 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <SheetTitle className="text-2xl font-bold">
                    {property.title}
                  </SheetTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getStatusColor(property.status)}>
                      {property.status}
                    </Badge>
                    <Badge variant="outline">
                      {property.offer_type === 'sale' ? 'For Sale' : 'For Rent'}
                    </Badge>
                    {property.featured && (
                      <Badge variant="secondary">Featured</Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 flex-wrap">
                {property.owner && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCall}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Owner
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEmail}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email Owner
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleWhatsApp}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onEdit?.(property as Property)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Property
                  </Button>
                )}
              </div>

              {/* Agent Info */}
              {property.profiles && (
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {property.profiles.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{property.profiles.name}</div>
                    <div className="text-muted-foreground">{property.profiles.email}</div>
                  </div>
                </div>
              )}
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Property Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Type</div>
                        <div className="font-medium">{property.property_type}</div>
                      </div>
                      {property.segment && (
                        <div>
                          <div className="text-sm text-muted-foreground">Segment</div>
                          <div className="font-medium">{property.segment}</div>
                        </div>
                      )}
                      {property.bedrooms && (
                        <div>
                          <div className="text-sm text-muted-foreground">Bedrooms</div>
                          <div className="flex items-center gap-1 font-medium">
                            <Bed className="w-4 h-4" />
                            {property.bedrooms}
                          </div>
                        </div>
                      )}
                      {property.bathrooms && (
                        <div>
                          <div className="text-sm text-muted-foreground">Bathrooms</div>
                          <div className="flex items-center gap-1 font-medium">
                            <Bath className="w-4 h-4" />
                            {property.bathrooms}
                          </div>
                        </div>
                      )}
                      {property.area_sqft && (
                        <div>
                          <div className="text-sm text-muted-foreground">Area</div>
                          <div className="flex items-center gap-1 font-medium">
                            <Square className="w-4 h-4" />
                            {property.area_sqft.toLocaleString()} sqft
                          </div>
                        </div>
                      )}
                      {property.permit_number && (
                        <div>
                          <div className="text-sm text-muted-foreground">Permit #</div>
                          <div className="font-medium">{property.permit_number}</div>
                        </div>
                      )}
                    </div>

                    {property.description && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Description</div>
                        <p className="text-sm">{property.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">{property.address}</div>
                      {property.unit_number && (
                        <div className="text-muted-foreground">Unit {property.unit_number}</div>
                      )}
                      <div className="text-muted-foreground">
                        {property.city}, {property.state} {property.zip_code}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Owner Contact */}
                {property.owner && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Owner Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Name</div>
                        <div className="font-medium">{property.owner.name}</div>
                      </div>
                      {property.owner.phone && (
                        <div>
                          <div className="text-sm text-muted-foreground">Phone</div>
                          <div className="font-medium">{property.owner.phone}</div>
                        </div>
                      )}
                      {property.owner.email && (
                        <div>
                          <div className="text-sm text-muted-foreground">Email</div>
                          <div className="font-medium">{property.owner.email}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-4">
                <PropertyFilesSection
                  propertyId={property.id}
                  canEdit={canEdit}
                  onUpdate={onUpdate}
                />
              </TabsContent>

              {/* Activities Tab */}
              <TabsContent value="activities" className="space-y-4 mt-4">
                {activities.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No activity yet
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <Card key={activity.id}>
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            <Activity className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium capitalize">
                                  {activity.type.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                              {activity.profiles && (
                                <p className="text-xs text-muted-foreground">
                                  by {activity.profiles.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
