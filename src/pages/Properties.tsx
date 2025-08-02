import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddPropertyForm } from "@/components/forms/AddPropertyForm";
import { useProperties, Property } from "@/hooks/useProperties";
import {
  Search,
  Plus,
  Edit,
  Eye,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Home,
  Building,
  Filter,
  Star,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Properties = () => {
  const { properties, loading } = useProperties();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const { toast } = useToast();

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || property.property_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'sold': return 'bg-info text-info-foreground';
      case 'off_market': return 'bg-muted text-muted-foreground';
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

  const totalProperties = properties.length;
  const availableProperties = properties.filter(p => p.status === 'available').length;
  const pendingProperties = properties.filter(p => p.status === 'pending').length;
  const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Property Manager</h1>
          <p className="text-muted-foreground">
            Manage your property listings and inventory
          </p>
        </div>
        <Button className="btn-primary" onClick={() => setShowAddProperty(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Home className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold">{totalProperties}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{availableProperties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingProperties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold">${(avgPrice / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search properties by title or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="off-market">Off Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="card-elevated hover:shadow-lg transition-all duration-200">
            <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
              <Home className="w-12 h-12 text-muted-foreground" />
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
                <Badge className={getStatusColor(property.status)}>
                  {property.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {getTypeIcon(property.property_type)}
                  <span className="text-sm capitalize">{property.property_type}</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  ${(property.price / 1000).toFixed(0)}K
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

              <div className="text-sm text-muted-foreground">
                Listed by {property.profiles?.name || 'Agent'} • {new Date(property.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedProperty(property)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{selectedProperty?.title}</DialogTitle>
                    </DialogHeader>
                    {selectedProperty && (
                      <div className="space-y-6">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <Home className="w-16 h-16 text-muted-foreground" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Address</Label>
                            <p className="mt-1">{selectedProperty.address}</p>
                          </div>
                          <div>
                            <Label>Price</Label>
                            <p className="mt-1 text-2xl font-bold text-primary">
                              ${selectedProperty.price.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <Label>Type</Label>
                            <p className="mt-1 capitalize">{selectedProperty.property_type}</p>
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Badge className={getStatusColor(selectedProperty.status)}>
                              {selectedProperty.status}
                            </Badge>
                          </div>
                        </div>

                        {selectedProperty.property_type !== 'commercial' && (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Bedrooms</Label>
                              <p className="mt-1">{selectedProperty.bedrooms}</p>
                            </div>
                            <div>
                              <Label>Bathrooms</Label>
                              <p className="mt-1">{selectedProperty.bathrooms}</p>
                            </div>
                            <div>
                              <Label>Square Feet</Label>
                              <p className="mt-1">{selectedProperty.area_sqft?.toLocaleString() || 'N/A'}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Description</Label>
                          <p className="mt-1 text-muted-foreground">{selectedProperty.description}</p>
                        </div>

                        <div>
                          <Label>Features</Label>
                          <p className="mt-1 text-muted-foreground">Custom features can be added in future updates</p>
                        </div>

                        <div className="flex gap-2">
                          <Button className="btn-primary">Edit Property</Button>
                          <Button variant="outline">Share Listing</Button>
                          <Button variant="outline">Schedule Viewing</Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding your first property'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Property Form */}
      <AddPropertyForm 
        open={showAddProperty} 
        onOpenChange={setShowAddProperty} 
      />
    </div>
  );
};