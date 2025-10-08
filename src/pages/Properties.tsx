import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AddPropertyForm } from "@/components/forms/AddPropertyForm";
import { StatsCard } from "@/components/dashboard/StatsCard";
import ClearableSelect from "@/components/ui/ClearableSelect";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { PropertyDeleteDialog } from "@/components/properties/PropertyDeleteDialog";
import { PropertyEditSidebar } from "@/components/properties/PropertyEditSidebar";
import { PropertyDetailDrawer } from "@/components/properties/PropertyDetailDrawer";
import { ExportPropertyDialog } from "@/components/properties/PropertyExportDialog";
import { useProperties, Property } from "@/hooks/useProperties";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_SEGMENTS, OFFER_TYPES, PROPERTY_STATUS, CITIES, getSubtypeOptions, LOCATIONS, VIEW_OPTIONS, SORT_OPTIONS } from "@/constants/property";
import { BEDROOM_OPTIONS } from "@/constants/bedrooms";
import { SearchableContactCombobox } from "@/components/ui/SearchableContactCombobox";
import UnifiedContactForm from "@/components/forms/UnifiedContactForm";
import ResponsiveDialog from "@/components/ui/ResponsiveDialog";
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
  Share2,
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

// Filter state interface
interface FilterState {
  search: string;
  propertyType: string;
  subtype: string;
  offerType: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  minBathrooms: string;
  maxBathrooms: string;
  minBuiltUpArea: string;
  maxBuiltUpArea: string;
  minPlotArea: string;
  maxPlotArea: string;
  city: string;
  assignedAgent: string;
  ownerContact: string;
  view: string;
  sort: string;
}

// Property stats interface
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
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showEditSidebar, setShowEditSidebar] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [propertyToShare, setPropertyToShare] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [selectedPropertyForContact, setSelectedPropertyForContact] = useState<Property | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [currency, setCurrency] = useState('AED');
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [stats, setStats] = useState<PropertyStats>({
    total: 0,
    availableForSale: 0,
    availableForRent: 0,
    totalValue: 0,
    loading: true
  });

  const { toast } = useToast();

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    propertyType: searchParams.get('propertyType') || '',
    subtype: searchParams.get('subtype') || '',
    offerType: searchParams.get('offerType') || '',
    status: searchParams.get('status') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    minBathrooms: searchParams.get('minBathrooms') || '',
    maxBathrooms: searchParams.get('maxBathrooms') || '',
    minBuiltUpArea: searchParams.get('minBuiltUpArea') || '',
    maxBuiltUpArea: searchParams.get('maxBuiltUpArea') || '',
    minPlotArea: searchParams.get('minPlotArea') || '',
    maxPlotArea: searchParams.get('maxPlotArea') || '',
    city: searchParams.get('city') || '',
    assignedAgent: searchParams.get('assignedAgent') || '',
    ownerContact: searchParams.get('ownerContact') || '',
    view: searchParams.get('view') || '',
    sort: searchParams.get('sort') || 'date_new_old',
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

      // Agent filtering: agents only see their own properties
      const isAgent = profile?.role === 'agent';
      if (isAgent && user?.id) {
        query = query.eq('agent_id', user.id);
      }

      // Apply filters to stats query
      if (filters.propertyType) {
        query = query.eq('segment', filters.propertyType);
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
    
    // Load agents for admin filter
    const loadAgents = async () => {
      if (isAdmin) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .eq('role', 'agent')
          .eq('status', 'active');
          
        if (data) {
          setAgents(data.map(agent => ({ id: agent.user_id, name: agent.name, email: agent.email })));
        }
      }
    };
    
    loadAgents();
  }, [fetchStats, isAdmin]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = properties.filter(property => {
      // Agent filtering: agents only see their own properties
      const isAgent = profile?.role === 'agent';
      if (isAgent && property.agent_id !== user?.id) {
        return false;
      }
      
      // Search filtering
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          property.title?.toLowerCase().includes(searchLower) ||
          property.address?.toLowerCase().includes(searchLower) ||
          property.permit_number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Basic filters
      if (filters.propertyType && property.segment !== filters.propertyType) return false;
      if (filters.subtype && property.subtype !== filters.subtype) return false;
      if (filters.offerType && property.offer_type !== filters.offerType) return false;
      if (filters.status && property.status !== filters.status) return false;

      // Advanced filters
      if (isAdvancedMode) {
        if (filters.minPrice && property.price < parseFloat(filters.minPrice)) return false;
        if (filters.maxPrice && property.price > parseFloat(filters.maxPrice)) return false;
        if (filters.bedrooms) {
          const propertyBedroomEnum = property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} BHK`;
          if (propertyBedroomEnum !== filters.bedrooms) return false;
        }
        if (filters.minBathrooms && (property.bathrooms || 0) < parseFloat(filters.minBathrooms)) return false;
        if (filters.maxBathrooms && (property.bathrooms || 0) > parseFloat(filters.maxBathrooms)) return false;
        if (filters.minBuiltUpArea && (property.area_sqft || 0) < parseInt(filters.minBuiltUpArea)) return false;
        if (filters.maxBuiltUpArea && (property.area_sqft || 0) > parseInt(filters.maxBuiltUpArea)) return false;
        if (filters.minPlotArea && (property.area_sqft || 0) < parseInt(filters.minPlotArea)) return false;
        if (filters.maxPlotArea && (property.area_sqft || 0) > parseInt(filters.maxPlotArea)) return false;
        if (filters.city && !property.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
        if (filters.assignedAgent && property.agent_id !== filters.assignedAgent) return false;
        if (filters.ownerContact && property.owner_contact_id !== filters.ownerContact) return false;
        if (filters.view && property.view !== filters.view) return false;
      }

      return true;
    });

    // Apply sorting
    switch (filters.sort) {
      case 'date_old_new':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'price_low_high':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high_low':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'date_new_old':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return filtered;
  }, [properties, filters, debouncedSearch, isAdvancedMode]);

  const handleDeleteProperty = async (property: Property) => {
    if (!isAdmin && property.agent_id !== user?.id) {
      toast({
        title: 'Access denied',
        description: 'You can only delete your own properties.',
        variant: 'destructive',
      });
      return;
    }
    setPropertyToDelete(property);
  };

  const confirmDeleteProperty = async () => {
    if (!propertyToDelete) return;
    
    setDeleting(propertyToDelete.id);
    try {
      await deleteProperty(propertyToDelete.id);
      await fetchStats();
      setPropertyToDelete(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditProperty = (property: Property) => {
    if (!isAdmin && property.agent_id !== user?.id) {
      toast({
        title: 'Access denied',
        description: 'You can only edit your own properties.',
        variant: 'destructive',
      });
      return;
    }
    setPropertyToEdit(property);
    setShowEditSidebar(true);
  };

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowDetailView(true);
  };

  const handleShareProperty = (property: Property) => {
    setPropertyToShare(property);
    setShowShareDialog(true);
  };

  const handleScheduleViewing = (property: Property) => {
    // Navigate to calendar with property pre-filled for viewing
    navigate(`/calendar?property=${property.id}&action=schedule-viewing&type=property_viewing`);
  };

  const handleAddContactToProperty = (property: Property) => {
    setSelectedPropertyForContact(property);
    setShowAddContact(true);
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      propertyType: '',
      subtype: '',
      offerType: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      minBathrooms: '',
      maxBathrooms: '',
      minBuiltUpArea: '',
      maxBuiltUpArea: '',
      minPlotArea: '',
      maxPlotArea: '',
      city: '',
      assignedAgent: '',
      ownerContact: '',
      view: '',
      sort: 'date_new_old',
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Property Manager</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your property listings and inventory
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-20 sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AED">AED</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
          <Button className="btn-primary flex-1 sm:flex-none" onClick={() => setShowAddProperty(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Total Properties"
          value={stats.loading ? "..." : stats.total.toString()}
          icon={Home}
          className="card-elevated"
        />
        <StatsCard
          title="For Sale"
          value={stats.loading ? "..." : stats.availableForSale.toString()}
          icon={Star}
          className="card-elevated"
        />
        <StatsCard
          title="For Rent"
          value={stats.loading ? "..." : stats.availableForRent.toString()}
          icon={Coins}
          className="card-elevated"
        />
        <StatsCard
          title="Portfolio Value"
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
                  value={filters.propertyType}
                  onChange={(value) => {
                    updateFilter('propertyType', value || '');
                    updateFilter('subtype', '');
                  }}
                  options={PROPERTY_SEGMENTS}
                  placeholder="Property Type"
                  className="w-40"
                />
                
                <ClearableSelect
                  value={filters.subtype}
                  onChange={(value) => updateFilter('subtype', value || '')}
                  options={getSubtypeOptions(filters.propertyType)}
                  placeholder="Subtype"
                  className="w-40"
                  disabled={!filters.propertyType}
                />
                
                <ClearableSelect
                  value={filters.offerType}
                  onChange={(value) => updateFilter('offerType', value || '')}
                  options={OFFER_TYPES}
                  placeholder="Offer Type"
                  className="w-32"
                />

                <ClearableSelect
                  value={filters.sort}
                  onChange={(value) => updateFilter('sort', value || 'date_new_old')}
                  options={SORT_OPTIONS}
                  placeholder="Sort by"
                  className="w-40"
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
                    <ClearableSelect
                      value={filters.bedrooms}
                      onChange={(value) => updateFilter('bedrooms', value || '')}
                      options={BEDROOM_OPTIONS}
                      placeholder="Any Bedrooms"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Built-up Area (sq ft)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minBuiltUpArea}
                        onChange={(e) => updateFilter('minBuiltUpArea', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxBuiltUpArea}
                        onChange={(e) => updateFilter('maxBuiltUpArea', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Plot Area (sq ft)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minPlotArea}
                        onChange={(e) => updateFilter('minPlotArea', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPlotArea}
                        onChange={(e) => updateFilter('maxPlotArea', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  {user && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Owner Contact</Label>
                      <SearchableContactCombobox
                        value={filters.ownerContact}
                        onChange={(value) => updateFilter('ownerContact', value || '')}
                        placeholder="Select owner contact"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">City</Label>
                    <Input
                      placeholder="Enter city..."
                      value={filters.city}
                      onChange={(e) => updateFilter('city', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Assigned Agent</Label>
                      <Select value={filters.assignedAgent || '__all__'} onValueChange={(value) => updateFilter('assignedAgent', value === '__all__' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Agents</SelectItem>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">View</Label>
                    <ClearableSelect
                      value={filters.view}
                      onChange={(value) => updateFilter('view', value || '')}
                      options={VIEW_OPTIONS}
                      placeholder="Any View"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Properties List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProperties.length} of {properties.length} properties
          </p>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="card-elevated">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="bg-muted h-48 rounded"></div>
                    <div className="space-y-2">
                      <div className="bg-muted h-4 rounded w-3/4"></div>
                      <div className="bg-muted h-4 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Home className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {getActiveFilterCount() > 0
                  ? "Try adjusting your filters to see more results"
                  : "Get started by adding your first property listing"
                }
              </p>
              {getActiveFilterCount() > 0 && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
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
                      variant="outline"
                      onClick={() => handleScheduleViewing(property)}
                      title="Schedule a viewing for this property"
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                     <Button 
                       size="sm" 
                       variant="ghost"
                       onClick={() => handleShareProperty(property)}
                     >
                       <Share2 className="w-4 h-4" />
                     </Button>
                     <Button 
                       size="sm" 
                       variant="ghost"
                       onClick={() => handleEditProperty(property)}
                       disabled={!isAdmin && property.agent_id !== user?.id}
                       title={!isAdmin && property.agent_id !== user?.id ? "You can only edit your own properties" : "Edit property"}
                     >
                       <Edit className="w-4 h-4" />
                     </Button>
                     {isAdmin && (
                       <Button 
                         size="sm" 
                         variant="ghost" 
                         className="text-destructive hover:text-destructive"
                         onClick={() => handleDeleteProperty(property)}
                         disabled={deleting === property.id}
                         title="Delete property"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Property Add Dialog */}
      <AddPropertyForm
        open={showAddProperty}
        onOpenChange={setShowAddProperty}
        onSuccess={fetchStats}
      />

      {/* Property Edit Sidebar */}
      <PropertyEditSidebar
        property={propertyToEdit}
        open={showEditSidebar}
        onOpenChange={setShowEditSidebar}
        onSuccess={() => {
          fetchStats();
          setPropertyToEdit(null);
        }}
      />

      {/* Property Detail Drawer */}
      <PropertyDetailDrawer
        property={selectedProperty}
        open={showDetailView}
        onClose={() => setShowDetailView(false)}
        onEdit={handleEditProperty}
        onUpdate={fetchStats}
      />

      {/* Property Delete Dialog */}
      <PropertyDeleteDialog
        open={!!propertyToDelete}
        onOpenChange={(open) => !open && setPropertyToDelete(null)}
        onConfirm={confirmDeleteProperty}
        propertyTitle={propertyToDelete?.title || ''}
        isDeleting={!!deleting}
      />

      {/* Property Export Dialog */}
      <ExportPropertyDialog
        property={propertyToShare}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />

      {/* Add Contact Dialog */}
      <ResponsiveDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        title="Add Contact"
      >
        {selectedPropertyForContact && (
          <UnifiedContactForm
            onSuccess={() => {
              setShowAddContact(false);
              setSelectedPropertyForContact(null);
            }}
          />
        )}
      </ResponsiveDialog>
    </div>
  );
};