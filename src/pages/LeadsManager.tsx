import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

export const LeadsManager = () => {
  const { profile } = useAuth();
  const { leads, loading, updateLead, addActivity, deleteLead, fetchLeads } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
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
    
    // Auto-update contact_status based on lead status (matching our database function)
    if (newStatus === 'contacted' || newStatus === 'qualified' || newStatus === 'negotiating') {
      updateData.contact_status = 'contacted';
    } else if (newStatus === 'won') {
      updateData.contact_status = 'active_client';
    } else if (newStatus === 'lost') {
      updateData.contact_status = 'past_client';
    } else if (newStatus === 'new') {
      updateData.contact_status = 'lead';
    }
    
    await updateLead(leadId, updateData);
    await addActivity(leadId, 'status_change', `Status changed to ${newStatus}`);
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

  const filteredLeads = leads.filter(lead => {
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
    toast({
      title: `Bulk action: ${action}`,
      description: `Applied to ${selectedLeads.length} leads`,
    });
    setSelectedLeads([]);
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
          <Button className="btn-primary w-full sm:w-auto shrink-0" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
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
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showAdvancedFilters ? 'Less' : 'More'}
            </Button>
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

      {/* Leads List */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                   <TableHead>Name</TableHead>
                   <TableHead>Contact</TableHead>
                   <TableHead>SLA & Assignment</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Priority</TableHead>
                   <TableHead>Contact Status</TableHead>
                   <TableHead>Source</TableHead>
                   <TableHead>Interest</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredLeads.map((lead) => (
                   <TableRow 
                     key={lead.id} 
                     className="hover:bg-muted/50 cursor-pointer transition-colors" 
                     onClick={() => handleRowClick(lead)}
                   >
                     <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      />
                    </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <p className="font-medium text-sm">{lead.name}</p>
                         <p className="text-xs text-muted-foreground">{lead.email}</p>
                       </div>
                     </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{lead.phone || 'No phone'}</p>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-primary/10">
                              <Phone className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-primary/10">
                              <Mail className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-primary/10">
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                     <TableCell>
                       <LeadSlaStatus lead={lead} agentName={lead.profiles?.name} />
                     </TableCell>
                     <TableCell onClick={(e) => e.stopPropagation()}>
                       <Badge className={`${getStatusColor(lead.status)} text-xs`}>
                         {lead.status}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline" className={`${getPriorityColor(lead.priority)} text-xs`}>
                         {lead.priority}
                       </Badge>
                     </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getContactStatusDisplay(lead.contact_status || 'lead')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{lead.source}</span>
                      </TableCell>
                     <TableCell>
                       <LeadMeta lead={lead} layout="table" />
                     </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">                          
                          {/* Admin-only Edit Button */}
                          {profile?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingLead(lead);
                                setShowEditForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {profile?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLead(lead.id)}
                              disabled={deleting === lead.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
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