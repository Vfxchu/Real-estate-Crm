import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Search, Filter } from 'lucide-react';
import ClearableSelect from '@/components/ui/ClearableSelect';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ContactsAdvancedSearchProps {
  onSearch: (filters: ContactSearchFilters) => void;
  onClear: () => void;
}

export interface ContactSearchFilters {
  name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'past';
  marketing_source?: string;
  interest_tags?: string[];
  created_after?: string;
  created_before?: string;
}

const MARKETING_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'email', label: 'Email Campaign' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'other', label: 'Other' }
];

const INTEREST_TAGS = [
  'Buyer', 'Seller', 'Tenant', 'Landlord', 'Investor'
];

export default function ContactsAdvancedSearch({ onSearch, onClear }: ContactsAdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<ContactSearchFilters>({});

  const handleFilterChange = (key: keyof ContactSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClearAll = () => {
    setFilters({});
    onClear();
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Advanced Search</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm">
              {isOpen ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <Label htmlFor="search-name">Name</Label>
                <Input
                  id="search-name"
                  placeholder="Search by name..."
                  value={filters.name || ''}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-email">Email</Label>
                <Input
                  id="search-email"
                  type="email"
                  placeholder="Search by email..."
                  value={filters.email || ''}
                  onChange={(e) => handleFilterChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-phone">Phone</Label>
                <Input
                  id="search-phone"
                  placeholder="Search by phone..."
                  value={filters.phone || ''}
                  onChange={(e) => handleFilterChange('phone', e.target.value)}
                />
              </div>

              {/* Status and Source */}
              <div className="space-y-2">
                <Label>Contact Status</Label>
                <ClearableSelect
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'past', label: 'Past Client' }
                  ]}
                  placeholder="Select status..."
                  allowClear
                />
              </div>

              <div className="space-y-2">
                <Label>Marketing Source</Label>
                <ClearableSelect
                  value={filters.marketing_source}
                  onChange={(value) => handleFilterChange('marketing_source', value)}
                  options={MARKETING_SOURCES}
                  placeholder="Select source..."
                  allowClear
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="search-date-after">Created After</Label>
                <Input
                  id="search-date-after"
                  type="date"
                  value={filters.created_after || ''}
                  onChange={(e) => handleFilterChange('created_after', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-date-before">Created Before</Label>
                <Input
                  id="search-date-before"
                  type="date"
                  value={filters.created_before || ''}
                  onChange={(e) => handleFilterChange('created_before', e.target.value)}
                />
              </div>
            </div>

            {/* Interest Tags */}
            <div className="mt-4 space-y-2">
              <Label>Interest Tags</Label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const currentTags = filters.interest_tags || [];
                      const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                      handleFilterChange('interest_tags', newTags.length > 0 ? newTags : undefined);
                    }}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      (filters.interest_tags || []).includes(tag)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClearAll}>
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}