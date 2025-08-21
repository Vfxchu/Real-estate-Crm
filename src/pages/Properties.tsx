import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AddPropertyForm } from "@/components/forms/AddPropertyForm";
import { StatsCard } from "@/components/dashboard/StatsCard";
import ClearableSelect from "@/components/ui/ClearableSelect";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { PropertyDeleteDialog } from "@/components/properties/PropertyDeleteDialog";
import { PropertyEditSidebar } from "@/components/properties/PropertyEditSidebar";
import { PropertyDetailView } from "@/components/properties/PropertyDetailView";
import { useProperties, Property } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_SEGMENTS, OFFER_TYPES, PROPERTY_STATUS, CITIES, getSubtypeOptions } from "@/constants/property";
import {
  Search,
  Plus,
  Edit,
  Eye,
  MapPin,
  Bed,
  Bath,
  Square,
  Home,
  Building,
  Star,
  Trash2,
  X,
  TrendingUp,
  Coins,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

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

// Filter state interface - aligned with PropertyForm schema
interface FilterState {
  search: string;
  segment: string;
  subtype: string;
  offerType: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  maxBedrooms: string;
  minBathrooms: string;
  maxBathrooms: string;
  minArea: string;
  maxArea: string;
  city: string;
  featured: string;
}

// Property stats interface - removed avgPrice
interface PropertyStats {
  total: number;
  availableForSale: number;
  availableForRent: number;
  totalValue: number;
  loading: boolean;
}

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const Properties = () => {
  const { properties, loading, deleteProperty } = useProperties();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showEditSidebar, setShowEditSidebar] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [activeTab, setActiveTab] = useState('residential');
  const [currency, setCurrency] = useState('AED');
  const [stats, setStats] = useState<PropertyStats>({
    total: 0,
    availableForSale: 0,
    availableForRent: 0,
    totalValue: 0,
    loading: true
  });

  const { toast } = useToast();

  // Initialize filters from URL params - aligned with schema
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    segment: searchParams.get('segment') || '',
    subtype: searchParams.get('subtype') || '',
    offerType: searchParams.get('offerType') || '',
    status: searchParams.get('status') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minBedrooms: searchParams.get('minBedrooms') || '',
    maxBedrooms: searchParams.get('maxBedrooms') || '',
    minBathrooms: searchParams.get('minBathrooms') || '',
    maxBathrooms: searchParams.get('maxBathrooms') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    city: searchParams.get('city') || '',
    featured: searchParams.get('featured') || '',
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Fetch aggregated stats from Supabase
  const fetchStats = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      let query = supabase
        .from('properties')
        .select('price, offer_type, status, segment');

      // Apply filters to stats query
      if (filters.segment) {
        query = query.eq('segment', filters.segment);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.offerType) {
        query = query.eq('offer_type', filters.offerType);
      }
      if (debouncedSearch) {
        query = query.or(`title.ilike.%${debouncedSearch}%,address.ilike.%${debouncedSearch}%,permit_number.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.length || 0;
      const availableForSale = data?.filter(p => p.status === 'available' && p.offer_type === 'sale').length || 0;
      const availableForRent = data?.filter(p => p.status === 'available' && p.offer_type === 'rent').length || 0;
      const totalValue = data?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

      setStats({
        total,
        availableForSale,
        availableForRent,
        totalValue,
        loading: false
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error fetching statistics',
        description: error.message,
        variant: 'destructive',
      });
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [filters, debouncedSearch, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Filter properties based on current filters and active tab
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Tab filtering
      const tabMatch = activeTab === 'residential' 
        ? property.segment === 'residential' || !property.segment
        : property.segment === 'commercial';

      if (!tabMatch) return false;

      // Search filtering
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          property.title?.toLowerCase().includes(searchLower) ||
          property.address?.toLowerCase().includes(searchLower) ||
          property.permit_number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Basic filters - use segment instead of propertyType
      if (filters.segment && property.segment !== filters.segment) return false;
      if (filters.subtype && property.subtype !== filters.subtype) return false;
      if (filters.offerType && property.offer_type !== filters.offerType) return false;
      if (filters.status && property.status !== filters.status) return false;

      // Advanced filters
      if (isAdvancedMode) {
        if (filters.minPrice && property.price < parseFloat(filters.minPrice)) return false;
        if (filters.maxPrice && property.price > parseFloat(filters.maxPrice)) return false;
        if (filters.minBedrooms && (property.bedrooms || 0) < parseInt(filters.minBedrooms)) return false;
        if (filters.maxBedrooms && (property.bedrooms || 0) > parseInt(filters.maxBedrooms)) return false;
        if (filters.minBathrooms && (property.bathrooms || 0) < parseInt(filters.minBathrooms)) return false;
        if (filters.maxBathrooms && (property.bathrooms || 0) > parseInt(filters.maxBathrooms)) return false;
        if (filters.minArea && (property.area_sqft || 0) < parseInt(filters.minArea)) return false;
        if (filters.maxArea && (property.area_sqft || 0) > parseInt(filters.maxArea)) return false;
        if (filters.city && !property.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
        if (filters.featured && ((property.featured ? 'yes' : 'no') !== filters.featured)) return false;
      }

      return true;
    });
  }, [properties, filters, debouncedSearch, isAdvancedMode, activeTab]);

  const handleDeleteProperty = async (property: Property) => {
    setPropertyToDelete(property);
  };

  const confirmDeleteProperty = async () => {
    if (!propertyToDelete) return;
    
    setDeleting(propertyToDelete.id);
    try {
      await deleteProperty(propertyToDelete.id);
      await fetchStats(); // Refresh stats after deletion
      setPropertyToDelete(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditProperty = (property: Property) => {
    setPropertyToEdit(property);
    setShowEditSidebar(true);
  };

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowDetailView(true);
  };

  const handleScheduleViewing = (property: Property) => {
    // Navigate to calendar with property pre-filled
    navigate(`/calendar?property=${property.id}&action=schedule-viewing`);
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      segment: '',
      subtype: '',
      offerType: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      maxBedrooms: '',
      minBathrooms: '',
      maxBathrooms: '',
      minArea: '',
      maxArea: '',
      city: '',
      featured: '',
    });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
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

  // Remove local getSubtypeOptions function since we import it

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
        <div className="flex gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AED">AED</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
          <Button className="btn-primary" onClick={() => setShowAddProperty(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* KPI Cards - Removed Average Price */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Properties"
          value={stats.loading ? "..." : stats.total.toString()}
          icon={Home}
          className="card-elevated"
        />
        <StatsCard
          title="Available for Sale"
          value={stats.loading ? "..." : stats.availableForSale.toString()}
          icon={Star}
          className="card-elevated"
        />
        <StatsCard
          title="Available for Rent"
          value={stats.loading ? "..." : stats.availableForRent.toString()}
          icon={Coins}
          className="card-elevated"
        />
        <StatsCard
          title="Total Portfolio Value"
          value={stats.loading ? "..." : formatCurrency(stats.totalValue, currency)}
          icon={TrendingUp}
          className="card-elevated"
        />
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by title, address, or permit number..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <ClearableSelect
                  value={filters.segment}
                  onChange={(value) => {
                    updateFilter('segment', value || '');
                    updateFilter('subtype', ''); // Clear subtype when segment changes
                  }}
                  options={PROPERTY_SEGMENTS}
                  placeholder="Property Segment"
                  className="w-40"
                />
                
                <ClearableSelect
                  value={filters.subtype}
                  onChange={(value) => updateFilter('subtype', value || '')}
                  options={getSubtypeOptions(filters.segment)}
                  placeholder="Subtype"
                  className="w-40"
                  disabled={!filters.segment}
                />
                
                <ClearableSelect
                  value={filters.offerType}
                  onChange={(value) => updateFilter('offerType', value || '')}
                  options={OFFER_TYPES}
                  placeholder="Offer Type"
                  className="w-32"
                />
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isAdvancedMode}
                    onCheckedChange={setIsAdvancedMode}
                    id="advanced-mode"
                  />
                  <Label htmlFor="advanced-mode" className="text-sm">Advanced</Label>
                </div>
                
                {getActiveFilterCount() > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Clear ({getActiveFilterCount()})
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {isAdvancedMode && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <ClearableSelect
                      value={filters.status}
                      onChange={(value) => updateFilter('status', value || '')}
                      options={PROPERTY_STATUS}
                      placeholder="Any Status"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Price Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Bedrooms</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minBedrooms}
                        onChange={(e) => updateFilter('minBedrooms', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxBedrooms}
                        onChange={(e) => updateFilter('maxBedrooms', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Area (sq ft)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minArea}
                        onChange={(e) => updateFilter('minArea', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxArea}
                        onChange={(e) => updateFilter('maxArea', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">City</Label>
                    <ClearableSelect
                      value={filters.city}
                      onChange={(value) => updateFilter('city', value || '')}
                      options={CITIES}
                      placeholder="Any City"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Featured</Label>
                    <ClearableSelect
                      value={filters.featured}
                      onChange={(value) => updateFilter('featured', value || '')}
                      options={[
                        { value: 'yes', label: 'Featured Only' },
                        { value: 'no', label: 'Non-Featured' },
                      ]}
                      placeholder="Any"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Gallery with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="residential">
              Residential ({properties.filter(p => p.segment === 'residential' || !p.segment).length})
            </TabsTrigger>
            <TabsTrigger value="commercial">
              Commercial ({properties.filter(p => p.segment === 'commercial').length})
            </TabsTrigger>
          </TabsList>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredProperties.length} properties
          </div>
        </div>

        <TabsContent value="residential" className="space-y-6">
          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="card-elevated hover:shadow-lg transition-all duration-200">
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
                      {formatCurrency(property.price, currency)}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProperty(property)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleEditProperty(property)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProperty(property)}
                      disabled={deleting === property.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commercial" className="space-y-6">
          {/* Properties Grid - Same structure but filtered for commercial */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="card-elevated hover:shadow-lg transition-all duration-200">
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
                      {formatCurrency(property.price, currency)}
                    </div>
                  </div>

                  {property.area_sqft && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Square className="w-4 h-4" />
                      <span>{property.area_sqft.toLocaleString()} sq ft</span>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Listed by {property.profiles?.name || 'Agent'} • {new Date(property.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProperty(property)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleEditProperty(property)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProperty(property)}
                      disabled={deleting === property.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredProperties.length === 0 && !loading && (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            {activeTab === 'residential' ? (
              <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            ) : (
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold mb-2">No {activeTab} properties found</h3>
            <p className="text-muted-foreground">
              {getActiveFilterCount() > 0
                ? 'Try adjusting your filters or search terms'
                : `Start by adding your first ${activeTab} property`
              }
            </p>
            {getActiveFilterCount() > 0 && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Property Edit Sidebar */}
      <PropertyEditSidebar
        property={propertyToEdit}
        open={showEditSidebar}
        onOpenChange={setShowEditSidebar}
        onSuccess={() => {
          setPropertyToEdit(null);
          fetchStats();
        }}
      />

      {/* Property Detail View */}
      <PropertyDetailView
        property={selectedProperty}
        open={showDetailView}
        onOpenChange={setShowDetailView}
        onEdit={handleEditProperty}
        onScheduleViewing={handleScheduleViewing}
      />

      {/* Property Delete Dialog */}
      <PropertyDeleteDialog
        open={!!propertyToDelete}
        onOpenChange={(open) => !open && setPropertyToDelete(null)}
        onConfirm={confirmDeleteProperty}
        propertyTitle={propertyToDelete?.title || ''}
        isDeleting={!!deleting}
      />

      {/* Add Property Form */}
      <AddPropertyForm 
        open={showAddProperty} 
        onOpenChange={setShowAddProperty}
        onSuccess={() => {
          fetchStats();
        }}
      />
    </div>
  );
};