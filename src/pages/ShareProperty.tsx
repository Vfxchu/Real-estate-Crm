import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { WhatsAppFloatingButton } from "@/components/chat/WhatsAppFloatingButton";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import {
  MapPin, Bed, Bath, Square, Building, Home, Phone, Mail, 
  MessageCircle, Calendar, Star, Compass
} from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', { 
    style: 'currency', 
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const ShareProperty = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      
      // Fetch property with agent profile
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          profiles:agent_id (
            name,
            email,
            phone
          )
        `)
        .eq('id', propertyId)
        .single();

      if (propertyError) {
        if (propertyError.code === 'PGRST116') {
          setError('Property not found');
        } else {
          throw propertyError;
        }
        return;
      }

      setProperty(propertyData as Property);
      setAgentProfile(propertyData.profiles);
    } catch (error: any) {
      console.error('Error fetching property:', error);
      setError('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Property Not Found</h1>
          <p className="text-muted-foreground">{error || 'The property you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const handleContactAgent = () => {
    if (agentProfile?.phone) {
      window.open(`tel:${agentProfile.phone}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    if (agentProfile?.phone) {
      const message = `Hi, I'm interested in the property: ${property.title} at ${property.address}. Could you provide more information?`;
      const whatsappUrl = `https://wa.me/${agentProfile.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleEmail = () => {
    if (agentProfile?.email) {
      const subject = `Inquiry about ${property.title}`;
      const body = `Hi,\n\nI'm interested in the property at ${property.address}. Could you please provide more information?\n\nProperty Details:\n- ${property.title}\n- ${formatCurrency(property.price)}\n- ${property.offer_type}\n\nThank you!`;
      window.open(`mailto:${agentProfile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/5">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-bold">DKV Properties</h1>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              {property.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Gallery */}
            <Card className="overflow-hidden shadow-lg">
              <CardContent className="p-0">
                <PropertyGallery 
                  images={property.images} 
                  propertyId={property.id}
                  propertyTitle={property.title}
                />
              </CardContent>
            </Card>

            {/* Property Info */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-2xl font-bold">
                      {property.title}
                    </CardTitle>
                    {property.featured && (
                      <Badge variant="default" className="ml-2">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{property.address}, {property.city}, {property.state}</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(property.price)}
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      for {property.offer_type}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Features */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {property.bedrooms && (
                    <div className="flex items-center gap-2 text-center">
                      <Bed className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{property.bedrooms}</p>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-2 text-center">
                      <Bath className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{property.bathrooms}</p>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                      </div>
                    </div>
                  )}
                  {property.area_sqft && (
                    <div className="flex items-center gap-2 text-center">
                      <Square className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{property.area_sqft}</p>
                        <p className="text-sm text-muted-foreground">Sq Ft</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-center">
                    <Compass className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold capitalize">{property.property_type}</p>
                      <p className="text-sm text-muted-foreground">Type</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {property.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description}
                    </p>
                  </div>
                )}

                {/* Property Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Property Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Segment:</span>
                        <span className="font-medium capitalize">{property.segment || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtype:</span>
                        <span className="font-medium capitalize">{property.subtype || 'N/A'}</span>
                      </div>
                      {property.permit_number && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Permit Number:</span>
                          <span className="font-medium">{property.permit_number}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {property.unit_number && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Unit Number:</span>
                          <span className="font-medium">{property.unit_number}</span>
                        </div>
                      )}
                      {property.zip_code && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ZIP Code:</span>
                          <span className="font-medium">{property.zip_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Agent Contact */}
              {agentProfile && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Agent</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold">{agentProfile.name}</h4>
                      <p className="text-sm text-muted-foreground">Property Agent</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={handleWhatsApp}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      
                      <Button 
                        onClick={handleContactAgent}
                        variant="outline" 
                        className="w-full"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call Now
                      </Button>
                      
                      <Button 
                        onClick={handleEmail}
                        variant="outline" 
                        className="w-full"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schedule Viewing */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Interested?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Schedule a viewing or get more information about this property.
                  </p>
                  <Button className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Viewing
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp */}
      <WhatsAppFloatingButton onClick={handleWhatsApp} />
    </div>
  );
};