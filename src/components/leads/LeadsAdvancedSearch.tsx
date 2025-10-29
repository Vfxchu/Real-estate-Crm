import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ClearableSelect from '@/components/ui/ClearableSelect';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Filter interfaces
export interface LeadSearchFilters {
  // Status & Priority
  leadStatus?: string;
  priority?: string;
  contactStatus?: string;
  
  // Source & Category
  source?: string;
  category?: string;
  
  // Interest Tags
  interestTags?: string;
  
  // Property Requirements
  segment?: string;
  subtype?: string;
  budgetSaleBand?: string;
  budgetRentBand?: string;
  bedrooms?: string;
  sizeBand?: string;
  
  // Location
  location?: string;
  
  // Communication
  contactPref?: string;
  
  // Date Range
  fromDate?: string;
  toDate?: string;
  
  // Agent (for admin)
  agent?: string;
}

interface LeadsAdvancedSearchProps {
  onSearch: (filters: LeadSearchFilters) => void;
  onClear: () => void;
  isAdmin?: boolean;
  agents?: Array<{ id: string; name: string }>;
}

// Source options - matching UnifiedContactForm
const sourceOptions = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'email', label: 'Email Campaign' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'other', label: 'Other' },
];

// Interest tag options
const interestTagOptions = [
  { value: 'Buyer', label: 'Buyer' },
  { value: 'Seller', label: 'Seller' },
  { value: 'Landlord', label: 'Landlord' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'Investor', label: 'Investor' },
];

// Budget bands
const budgetSaleOptions = [
  { value: 'under AED1M', label: 'Under AED 1M' },
  { value: 'AED1M – AED2M', label: 'AED 1M - 2M' },
  { value: 'AED2M – AED5M', label: 'AED 2M - 5M' },
  { value: 'AED5M – AED10M', label: 'AED 5M - 10M' },
  { value: 'AED10M - AED15M', label: 'AED 10M - 15M' },
  { value: 'Above AED15M', label: 'Above AED 15M' },
];

const budgetRentOptions = [
  { value: 'under AED100K', label: 'Under AED 100K/year' },
  { value: 'AED100K – AED200K', label: 'AED 100K - 200K/year' },
  { value: 'AED200K – AED300K', label: 'AED 200K - 300K/year' },
  { value: 'AED300K – AED500K', label: 'AED 300K - 500K/year' },
  { value: 'AED500K – AED1M', label: 'AED 500K - 1M/year' },
  { value: 'Above AED1M', label: 'Above AED 1M/year' },
];

const bedroomOptions = [
  { value: 'Studio', label: 'Studio' },
  { value: '1BR', label: '1BR' },
  { value: '2BR', label: '2BR' },
  { value: '3BR', label: '3BR' },
  { value: '4BR', label: '4BR' },
  { value: '5BR', label: '5BR' },
  { value: '6+ BR', label: '6+ BR' },
];

const subtypeOptions = [
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Plot', label: 'Plot' },
  { value: 'Building', label: 'Building' },
  { value: 'Office', label: 'Office' },
  { value: 'Shop', label: 'Shop' },
];

const sizeBandOptions = [
  { value: 'under 1000 sqft', label: 'Under 1,000 sqft' },
  { value: '1000-2000 sqft', label: '1,000 - 2,000 sqft' },
  { value: '2000-3000 sqft', label: '2,000 - 3,000 sqft' },
  { value: '3000-5000 sqft', label: '3,000 - 5,000 sqft' },
  { value: 'above 5000 sqft', label: 'Above 5,000 sqft' },
];

const contactPrefOptions = [
  { value: 'call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

export default function LeadsAdvancedSearch({ 
  onSearch, 
  onClear, 
  isAdmin = false,
  agents = [] 
}: LeadsAdvancedSearchProps) {
  const [filters, setFilters] = useState<LeadSearchFilters>({});
  const [isStatusOpen, setIsStatusOpen] = useState(true);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const handleFilterChange = (key: keyof LeadSearchFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    // Remove undefined values
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
    );
    onSearch(cleanedFilters as LeadSearchFilters);
  };

  const handleClearAll = () => {
    setFilters({});
    onClear();
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(v => v !== undefined && v !== '').length;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="card-elevated">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Advanced Filters</h4>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearAll}
              disabled={activeFilterCount === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
            <Button 
              size="sm"
              onClick={handleSearch}
            >
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Status & Priority Section */}
        <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <span className="text-sm font-medium">Status & Priority</span>
            {isStatusOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              <div>
                <Label htmlFor="leadStatus" className="text-xs text-muted-foreground">Lead Status</Label>
                <ClearableSelect
                  value={filters.leadStatus}
                  onChange={(value) => handleFilterChange('leadStatus', value)}
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'qualified', label: 'Qualified' },
                    { value: 'negotiating', label: 'Under Offer' },
                    { value: 'won', label: 'Won' },
                    { value: 'lost', label: 'Lost' },
                  ]}
                  placeholder="Select status"
                  className="h-9 text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="priority" className="text-xs text-muted-foreground">Priority</Label>
                <ClearableSelect
                  value={filters.priority}
                  onChange={(value) => handleFilterChange('priority', value)}
                  options={[
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                  placeholder="Select priority"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="contactStatus" className="text-xs text-muted-foreground">Contact Status</Label>
                <ClearableSelect
                  value={filters.contactStatus}
                  onChange={(value) => handleFilterChange('contactStatus', value)}
                  options={[
                    { value: 'lead', label: 'Not Contacted' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'active_client', label: 'Active Client' },
                    { value: 'past_client', label: 'Past Client' },
                  ]}
                  placeholder="Select contact status"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="source" className="text-xs text-muted-foreground">Source</Label>
                <ClearableSelect
                  value={filters.source}
                  onChange={(value) => handleFilterChange('source', value)}
                  options={sourceOptions}
                  placeholder="Select source"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-xs text-muted-foreground">Category</Label>
                <ClearableSelect
                  value={filters.category}
                  onChange={(value) => handleFilterChange('category', value)}
                  options={[
                    { value: 'property', label: 'Property' },
                    { value: 'requirement', label: 'Requirement' },
                  ]}
                  placeholder="Select category"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="interestTags" className="text-xs text-muted-foreground">Interest</Label>
                <ClearableSelect
                  value={filters.interestTags}
                  onChange={(value) => handleFilterChange('interestTags', value)}
                  options={interestTagOptions}
                  placeholder="Select interest"
                  className="h-9 text-sm"
                />
              </div>

              {isAdmin && agents.length > 0 && (
                <div>
                  <Label htmlFor="agent" className="text-xs text-muted-foreground">Agent</Label>
                  <ClearableSelect
                    value={filters.agent}
                    onChange={(value) => handleFilterChange('agent', value)}
                    options={agents.map(a => ({ value: a.id, label: a.name }))}
                    placeholder="Select agent"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Property Requirements Section */}
        <Collapsible open={isRequirementsOpen} onOpenChange={setIsRequirementsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <span className="text-sm font-medium">Property Requirements</span>
            {isRequirementsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              <div>
                <Label htmlFor="segment" className="text-xs text-muted-foreground">Segment</Label>
                <ClearableSelect
                  value={filters.segment}
                  onChange={(value) => handleFilterChange('segment', value)}
                  options={[
                    { value: 'residential', label: 'Residential' },
                    { value: 'commercial', label: 'Commercial' },
                  ]}
                  placeholder="Select segment"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="subtype" className="text-xs text-muted-foreground">Property Type</Label>
                <ClearableSelect
                  value={filters.subtype}
                  onChange={(value) => handleFilterChange('subtype', value)}
                  options={subtypeOptions}
                  placeholder="Select type"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="bedrooms" className="text-xs text-muted-foreground">Bedrooms</Label>
                <ClearableSelect
                  value={filters.bedrooms}
                  onChange={(value) => handleFilterChange('bedrooms', value)}
                  options={bedroomOptions}
                  placeholder="Select bedrooms"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="budgetSaleBand" className="text-xs text-muted-foreground">Budget (Sale)</Label>
                <ClearableSelect
                  value={filters.budgetSaleBand}
                  onChange={(value) => handleFilterChange('budgetSaleBand', value)}
                  options={budgetSaleOptions}
                  placeholder="Select budget"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="budgetRentBand" className="text-xs text-muted-foreground">Budget (Rent)</Label>
                <ClearableSelect
                  value={filters.budgetRentBand}
                  onChange={(value) => handleFilterChange('budgetRentBand', value)}
                  options={budgetRentOptions}
                  placeholder="Select budget"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="sizeBand" className="text-xs text-muted-foreground">Size</Label>
                <ClearableSelect
                  value={filters.sizeBand}
                  onChange={(value) => handleFilterChange('sizeBand', value)}
                  options={sizeBandOptions}
                  placeholder="Select size"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="contactPref" className="text-xs text-muted-foreground">Contact Preference</Label>
                <ClearableSelect
                  value={filters.contactPref}
                  onChange={(value) => handleFilterChange('contactPref', value)}
                  options={contactPrefOptions}
                  placeholder="Select preference"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Location Section */}
        <Collapsible open={isLocationOpen} onOpenChange={setIsLocationOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <span className="text-sm font-medium">Location</span>
            {isLocationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-3 pt-3">
              <div>
                <Label htmlFor="location" className="text-xs text-muted-foreground">Location/Address</Label>
                <Input
                  id="location"
                  placeholder="Enter location or address"
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Date Range Section */}
        <Collapsible open={isDateOpen} onOpenChange={setIsDateOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded px-2 transition-colors">
            <span className="text-sm font-medium">Date Range</span>
            {isDateOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div>
                <Label htmlFor="fromDate" className="text-xs text-muted-foreground">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="toDate" className="text-xs text-muted-foreground">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
