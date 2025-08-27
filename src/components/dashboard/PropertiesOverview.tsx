import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProperties, Property } from "@/hooks/useProperties";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Home,
  Building,
  ArrowRight,
  Plus,
} from 'lucide-react';

// Currency formatting with dirham symbol
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

export const PropertiesOverview = () => {
  const { properties, loading } = useProperties();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  // Filter properties based on role - agents see only their own properties
  const visibleProperties = isAdmin 
    ? properties 
    : properties.filter(property => property.agent_id === user?.id);

  // Show latest 3 properties
  const recentProperties = visibleProperties.slice(0, 3);

  const handleAddProperty = () => {
    navigate('/properties');
  };

  const handleViewAll = () => {
    navigate('/properties');
  };

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isAdmin ? 'Recent Properties' : 'My Properties'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {isAdmin ? 'Recent Properties' : 'My Properties'}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddProperty}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
          <Button variant="ghost" size="sm" onClick={handleViewAll}>
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentProperties.map((property) => (
            <div
              key={property.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(property.property_type)}
                      <p className="font-medium">{property.title}</p>
                      <Badge className={getStatusColor(property.status)}>
                        {property.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {property.offer_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {property.address}
                    </p>
                    {property.property_type !== 'commercial' && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          <span>{property.bedrooms || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          <span>{property.bathrooms || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="w-3 h-3" />
                          <span>{property.area_sqft?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(property.price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Listed by {property.profiles?.name || 'Agent'}
                    </div>
                  </div>
                </div>
                {isAdmin && property.profiles?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Agent: {property.profiles.name}
                  </p>
                )}
              </div>
            </div>
          ))}
          {visibleProperties.length === 0 && (
            <div className="text-center py-8">
              <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {isAdmin 
                  ? 'No properties found. Add your first property to get started!'
                  : 'No properties assigned to you yet.'
                }
              </p>
              <Button variant="outline" onClick={handleAddProperty} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};