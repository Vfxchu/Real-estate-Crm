import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadForm from "@/components/leads/LeadForm";
import { LeadMeta } from "@/components/leads/LeadMeta";
import { LeadSlaStatus } from "@/components/leads/LeadSlaStatus";
import { QuickCallActions } from "@/components/leads/QuickCallActions";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Download,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useIsMobile } from '@/hooks/use-mobile';

export const LeadsManager = () => {
  const { profile } = useAuth();
  const { leads, loading, updateLead, addActivity, deleteLead, fetchLeads } = useLeads();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showLeadDrawer, setShowLeadDrawer] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    const updateData: Partial<Lead> = { status: newStatus };
    
    // Auto-update contact_status based on lead status
    if (newStatus === 'contacted' || newStatus === 'qualified' || newStatus === 'negotiating') {
      updateData.contact_status = 'contacted';
    } else if (newStatus === 'won') {
      updateData.contact_status = 'active_client';
      // Create activity log for status change
      await addActivity(leadId, 'status_change', `Lead converted to Active Client - Won`);
    } else if (newStatus === 'lost') {
      updateData.contact_status = 'past_client';
      // Create activity log for status change
      await addActivity(leadId, 'status_change', `Lead converted to Past Client - Lost`);
    } else if (newStatus === 'new') {
      updateData.contact_status = 'lead';
    }
    
    await updateLead(leadId, updateData);
    await addActivity(leadId, 'status_change', `Status changed to ${newStatus}`);
    
    // Refresh the leads list to hide won/lost leads
    fetchLeads();
  };

  const handleContactStatusChange = async (leadId: string, newContactStatus: string) => {
    await updateLead(leadId, { contact_status: newContactStatus });
    await addActivity(leadId, 'contact_status_change', `Contact status changed to ${newContactStatus}`);
  };

  const getContactStatusDisplay = (status: string) => {
    switch (status) {
      case 'lead': return 'Not Contacted';
      case 'contacted': return 'Contacted';
      case 'active_client': return 'Active Client';
      case 'past_client': return 'Past Client';
      default: return 'Not Contacted';
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    setDeleting(leadId);
    try {
      await deleteLead(leadId);
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    } finally {
      setDeleting(null);
    }
  };

  // Status tab mapping
  const statusTabMapping = {
    'All': null,
    'New': 'new',
    'Contacted': 'contacted', 
    'Qualified': 'qualified',
    'Under Offer': 'negotiating', // Label mapping
    'Won': 'won',
    'Lost': 'lost',
    'Invalid': 'computed' // custom_fields check
  };

  // Helper functions for time-based visibility
  const getLastStatusChangeDate = (lead: Lead) => {
    // For won/lost leads, get from lead_status_changes (simulated via updated_at for now)
    if (lead.status === 'won' || lead.status === 'lost') {
      return lead.updated_at;
    }
    
    // For invalid, get from custom_fields
    if (lead.custom_fields?.invalid === 'true') {
      return lead.custom_fields?.invalid_at;
    }
    
    return null;
  };

  const shouldShowInLeads = (statusChangedAt: string | null) => {
    if (!statusChangedAt) return true;
    
    const changedAt = new Date(statusChangedAt);
    // Convert to Asia/Dubai timezone for month-end calculation
    const monthEnd = new Date(changedAt.getFullYear(), changedAt.getMonth() + 1, 1);
    return new Date() < monthEnd;
  };

  const shouldShowLead = (lead: Lead) => {
    // Handle won/lost with 30-day window
    if (lead.status === 'won' || lead.status === 'lost') {
      const lastStatusChange = getLastStatusChangeDate(lead);
      return shouldShowInLeads(lastStatusChange);
    }
    
    // Handle invalid with custom_fields check + 30-day window
    if (lead.custom_fields?.invalid === 'true') {
      const invalidDate = lead.custom_fields?.invalid_at;
      return invalidDate ? shouldShowInLeads(invalidDate) : false;
    }
    
    return true; // Show all other statuses
  };

  const filterByTab = (leads: Lead[], activeTab: string) => {
    return leads.filter(lead => {
      if (!shouldShowLead(lead)) return false;
      
      switch(activeTab) {
        case 'All': return true;
        case 'New': return lead.status === 'new';
        case 'Contacted': return lead.status === 'contacted';
        case 'Qualified': return lead.status === 'qualified';
        case 'Under Offer': return lead.status === 'negotiating';
        case 'Won': return lead.status === 'won';
        case 'Lost': return lead.status === 'lost';
        case 'Invalid': return lead.custom_fields?.invalid === 'true';
        default: return true;
      }
    });
  };

  const filteredLeads = leads.filter(lead => {
    // Apply tab filtering first
    if (!filterByTab([lead], activeTab).length) {
      return false;
    }

    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.phone?.includes(searchTerm) ||
                         lead.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const matchesContactStatus = contactStatusFilter === 'all' || lead.contact_status === contactStatusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    const matchesCategory = categoryFilter === 'all' || lead.category === categoryFilter;
    const matchesAgent = agentFilter === 'all' || lead.profiles?.name === agentFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRangeFilter.from && dateRangeFilter.to) {
      const leadDate = new Date(lead.created_at);
      const fromDate = new Date(dateRangeFilter.from);
      const toDate = new Date(dateRangeFilter.to);
      matchesDateRange = leadDate >= fromDate && leadDate <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesContactStatus && 
           matchesSource && matchesCategory && matchesAgent && matchesDateRange;
  });

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-info text-info-foreground';
      case 'contacted': return 'bg-warning text-warning-foreground';
      case 'qualified': return 'bg-success text-success-foreground';
      case 'negotiating': return 'bg-primary text-primary-foreground';
      case 'won': return 'bg-success text-success-foreground';
      case 'lost': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: Lead['status']) => {
    if (status === 'negotiating') return 'Under Offer';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'high': return 'border-destructive text-destructive';
      case 'medium': return 'border-warning text-warning';
      case 'low': return 'border-muted-foreground text-muted-foreground';
      default: return 'border-muted-foreground text-muted-foreground';
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleBulkAction = (action: string) => {
    if (action === 'export') {
      handleExportLeads();
    } else {
      toast({
        title: `Bulk action: ${action}`,
        description: `Applied to ${selectedLeads.length} leads`,
      });
      setSelectedLeads([]);
    }
  };

  const handleExportLeads = () => {
    const { exportLeadsToCSV } = require('@/utils/csvExport');
    const leadsToExport = selectedLeads.length > 0 
      ? leads.filter(lead => selectedLeads.includes(lead.id))
      : filteredLeads;
    
    try {
      exportLeadsToCSV(leadsToExport, 'leads_export.csv');
      toast({
        title: 'Export complete',
        description: `Exported ${leadsToExport.length} leads successfully`,
      });
      setSelectedLeads([]);
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleImportLeads = async (file: File) => {
    const { parseLeadsFromFile, validateImportedLead } = await import('@/utils/csvImport');
    const { createLead } = await import('@/services/leads');
    
    try {
      toast({
        title: 'Importing...',
        description: 'Processing your file...',
      });

      const importedLeads = await parseLeadsFromFile(file);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const lead of importedLeads) {
        const validation = validateImportedLead(lead);
        
        if (!validation.valid) {
          errorCount++;
          errors.push(`${lead.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        const { error } = await createLead(lead as any);
        
        if (error) {
          errorCount++;
          errors.push(`${lead.name}: ${error.message}`);
        } else {
          successCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        await fetchLeads(); // Refresh the list
        toast({
          title: 'Import complete',
          description: `Successfully imported ${successCount} leads. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        });
      }

      if (errors.length > 0 && errors.length <= 5) {
        toast({
          title: 'Import errors',
          description: errors.join('\n'),
          variant: 'destructive',
        });
      } else if (errorCount > 5) {
        toast({
          title: 'Import errors',
          description: `${errorCount} leads failed to import. Check console for details.`,
          variant: 'destructive',
        });
        console.error('Import errors:', errors);
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDrawer(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground">
              {filteredLeads.length} leads • Manage and track all your leads
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              id="import-leads-file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportLeads(file);
                  e.target.value = ''; // Reset input
                }
              }}
            />
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => document.getElementById('import-leads-file')?.click()}
            >
              <Download className="w-4 h-4 mr-2 rotate-180" />
              Import
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={handleExportLeads}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="btn-primary w-full sm:w-auto shrink-0" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8 h-10">
              <TabsTrigger value="All" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="New" className="text-xs">New</TabsTrigger>
              <TabsTrigger value="Contacted" className="text-xs">Contacted</TabsTrigger>
              <TabsTrigger value="Qualified" className="text-xs">Qualified</TabsTrigger>
              <TabsTrigger value="Under Offer" className="text-xs">Under Offer</TabsTrigger>
              <TabsTrigger value="Won" className="text-xs">Won</TabsTrigger>
              <TabsTrigger value="Lost" className="text-xs">Lost</TabsTrigger>
              <TabsTrigger value="Invalid" className="text-xs">Invalid</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search and Quick Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {[...new Set(leads.map(lead => lead.profiles?.name).filter(Boolean))].map(agentName => (
                  <SelectItem key={agentName} value={agentName!}>
                    {agentName}
                  </SelectItem>
                ))}
                <SelectItem value="Unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                checked={showAdvancedFilters}
                onCheckedChange={setShowAdvancedFilters}
                id="advanced-mode"
              />
              <Label htmlFor="advanced-mode" className="text-sm">Advanced</Label>
            </div>
          </div>
        </div>

        {/* Active Filters Chips */}
        {(statusFilter !== 'all' || agentFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Status: {statusFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0"
                  onClick={() => setStatusFilter('all')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {agentFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Agent: {agentFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0"
                  onClick={() => setAgentFilter('all')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {priorityFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Priority: {priorityFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0"
                  onClick={() => setPriorityFilter('all')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Search: {searchTerm}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setContactStatusFilter('all');
                setSourceFilter('all');
                setCategoryFilter('all');
                setAgentFilter('all');
                setDateRangeFilter({ from: '', to: '' });
                setSearchTerm('');
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters Collapsible */}
      {showAdvancedFilters && (
        <Card className="card-elevated">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 text-sm">Advanced Filters</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Contact Status</Label>
                <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contact Status</SelectItem>
                    <SelectItem value="lead">Not Contacted</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="active_client">Active Client</SelectItem>
                    <SelectItem value="past_client">Past Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="advertising">Advertising</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="requirement">Requirement</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                <Input
                  type="date"
                  value={dateRangeFilter.from}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, from: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setContactStatusFilter('all');
                    setSourceFilter('all');
                    setCategoryFilter('all');
                    setAgentFilter('all');
                    setDateRangeFilter({ from: '', to: '' });
                    setSearchTerm('');
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile and Desktop Content */}
      <div className="block md:hidden">
        {/* Mobile Grid View */}
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3 animate-pulse">
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button onClick={() => setShowAddForm(true)}>Add New Lead</Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
              <Card 
                key={lead.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => handleRowClick(lead)}
              >
                <div className="space-y-3">
                  {/* Lead Name */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg truncate flex-1">{lead.name}</h3>
                           <Badge className={getStatusColor(lead.status)}>
                             {getStatusLabel(lead.status)}
                           </Badge>
                  </div>
                  
                  {/* Contact Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  </div>
                  
                   {/* Tags (excluding Seller/Landlord) */}
                   {lead.interest_tags && lead.interest_tags.length > 0 && (
                     <div className="flex flex-wrap gap-1">
                       {lead.interest_tags
                         .filter(tag => !['Seller', 'Landlord'].includes(tag))
                         .slice(0, 3)
                         .map((tag) => (
                           <Badge key={tag} variant="secondary" className="text-xs">
                             {tag}
                           </Badge>
                         ))}
                       {lead.interest_tags.filter(tag => !['Seller', 'Landlord'].includes(tag)).length > 3 && (
                         <Badge variant="outline" className="text-xs">
                           +{lead.interest_tags.filter(tag => !['Seller', 'Landlord'].includes(tag)).length - 3} more
                         </Badge>
                       )}
                     </div>
                   )}
                  
                  {/* Requirements */}
                  {(lead.segment || lead.budget_sale_band || lead.budget_rent_band) && (
                    <div className="text-sm text-muted-foreground">
                      {lead.segment && <div>Looking for: {lead.segment}</div>}
                      {lead.budget_sale_band && <div>Budget Range: {lead.budget_sale_band}</div>}
                      {lead.budget_rent_band && <div>Rent Budget: {lead.budget_rent_band}</div>}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLead(lead);
                        setShowEditForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Lead
                    </Button>
                    {(profile?.role === 'admin' || lead.agent_id === profile?.user_id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLead(lead.id);
                        }}
                        disabled={deleting === lead.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === lead.id ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete Lead
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="card-elevated hidden md:block">
        {selectedLeads.length > 0 && (
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('assign')}>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('status')}>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('export')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.length === filteredLeads.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium">Lead</TableHead>
                  <TableHead className="text-xs font-medium">Contact Details</TableHead>
                  <TableHead className="text-xs font-medium">Tags</TableHead>
                  <TableHead className="text-xs font-medium">Status</TableHead>
                  <TableHead className="text-xs font-medium">Requirements</TableHead>
                  <TableHead className="text-xs font-medium">Agent</TableHead>
                  <TableHead className="text-xs font-medium">Created</TableHead>
                  <TableHead className="text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <div className="flex items-center space-x-4 py-2">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="text-muted-foreground">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No leads found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                        <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                          Add New Lead
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(lead)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="text-sm font-medium truncate max-w-[200px]">{lead.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-wrap gap-1 max-w-[150px]">
                           {lead.interest_tags && lead.interest_tags.length > 0 ? (
                             lead.interest_tags
                               .filter(tag => !['Seller', 'Landlord'].includes(tag))
                               .slice(0, 2)
                               .map((tag) => (
                                 <Badge key={tag} variant="secondary" className="text-xs">
                                   {tag}
                                 </Badge>
                               ))
                           ) : (
                             <span className="text-xs text-muted-foreground">No tags</span>
                           )}
                           {lead.interest_tags && lead.interest_tags.filter(tag => !['Seller', 'Landlord'].includes(tag)).length > 2 && (
                             <Badge variant="outline" className="text-xs">
                               +{lead.interest_tags.filter(tag => !['Seller', 'Landlord'].includes(tag)).length - 2}
                             </Badge>
                           )}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="space-y-1">
                           <Badge className={getStatusColor(lead.status)}>
                             {getStatusLabel(lead.status)}
                           </Badge>
                           <div className="text-xs text-muted-foreground">
                             {getContactStatusDisplay(lead.contact_status || 'lead')}
                           </div>
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {lead.segment && (
                            <div>Looking for: {lead.segment}</div>
                          )}
                          {lead.budget_sale_band && (
                            <div>Budget: {lead.budget_sale_band}</div>
                          )}
                          {lead.budget_rent_band && (
                            <div>Rent: {lead.budget_rent_band}</div>
                          )}
                          {!lead.segment && !lead.budget_sale_band && !lead.budget_rent_band && (
                            <span className="text-muted-foreground">No requirements</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.profiles?.name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(lead);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLead(lead);
                              setShowEditForm(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {(profile?.role === 'admin' || lead.agent_id === profile?.user_id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLead(lead.id);
                              }}
                              disabled={deleting === lead.id}
                              className="h-8 w-8 p-0"
                            >
                              {deleting === lead.id ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={showLeadDrawer}
        onClose={() => {
          setShowLeadDrawer(false);
          setSelectedLead(null);
        }}
        onUpdate={fetchLeads}
      />

      {/* Add Lead Form */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <LeadForm
              context="admin"
              onSuccess={async () => {
                await fetchLeads();
                setShowAddForm(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin-only Edit Lead Form */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Lead - {editingLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {editingLead && (
              <LeadForm
                context="admin"
                defaultValues={editingLead}
                onSuccess={async () => {
                  await fetchLeads();
                  setShowEditForm(false);
                  setEditingLead(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};