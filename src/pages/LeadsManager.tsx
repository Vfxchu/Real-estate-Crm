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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Leads Manager</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and track all your leads in one place
          </p>
        </div>
        <Button className="btn-primary w-full sm:w-auto shrink-0" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Filters and Actions */}
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search leads by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 md:w-40">
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

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-32 md:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
               </Select>

               <Button 
                 variant="outline"
                 size="sm"
                 onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                 className="whitespace-nowrap w-full sm:w-auto"
               >
                 <Filter className="w-4 h-4 mr-2" />
                 {showAdvancedFilters ? 'Hide' : 'More'}
               </Button>

               <Button variant="outline" size="sm" className="whitespace-nowrap w-full sm:w-auto">
                 <Download className="w-4 h-4 mr-2" />
                 Export
               </Button>
             </div>
           </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium mb-3">Advanced Filters</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {/* Contact Status Filter */}
                 <div>
                   <Label className="text-sm font-medium">Contact Status</Label>
                   <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                     <SelectTrigger className="w-full">
                       <SelectValue placeholder="Contact Status" />
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

                 {/* Source Filter */}
                 <div>
                   <Label className="text-sm font-medium">Source</Label>
                   <Select value={sourceFilter} onValueChange={setSourceFilter}>
                     <SelectTrigger className="w-full">
                       <SelectValue placeholder="Source" />
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

                 {/* Category Filter */}
                 <div>
                   <Label className="text-sm font-medium">Category</Label>
                   <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                     <SelectTrigger className="w-full">
                       <SelectValue placeholder="Category" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Categories</SelectItem>
                       <SelectItem value="property">Property</SelectItem>
                       <SelectItem value="requirement">Requirement</SelectItem>
                       <SelectItem value="both">Both</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Agent Filter */}
                 <div>
                   <Label className="text-sm font-medium">Agent</Label>
                   <Select value={agentFilter} onValueChange={setAgentFilter}>
                     <SelectTrigger className="w-full">
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
                 </div>

                 {/* Date Range Filter */}
                 <div>
                   <Label className="text-sm font-medium">From Date</Label>
                   <Input
                     type="date"
                     value={dateRangeFilter.from}
                     onChange={(e) => setDateRangeFilter(prev => ({ ...prev, from: e.target.value }))}
                     className="w-full"
                   />
                 </div>

                 <div>
                   <Label className="text-sm font-medium">To Date</Label>
                   <Input
                     type="date"
                     value={dateRangeFilter.to}
                     onChange={(e) => setDateRangeFilter(prev => ({ ...prev, to: e.target.value }))}
                     className="w-full"
                   />
                 </div>

                 {/* Clear Filters Button */}
                 <div className="flex items-end">
                   <Button 
                     variant="outline" 
                     className="w-full"
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
                     Clear All Filters
                   </Button>
                 </div>
               </div>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>
            Leads ({filteredLeads.length})
          </CardTitle>
        </CardHeader>
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
                  <TableRow key={lead.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <p className="text-sm">{lead.phone || 'No phone'}</p>
                         <div className="flex gap-1">
                           <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                             <Phone className="w-3 h-3" />
                           </Button>
                           <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                             <Mail className="w-3 h-3" />
                           </Button>
                           <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                             <MessageSquare className="w-3 h-3" />
                           </Button>
                         </div>
                       </div>
                     </TableCell>
                     <TableCell>
                       <LeadSlaStatus lead={lead} agentName={lead.profiles?.name} />
                     </TableCell>
                    <TableCell>
                      <Select value={lead.status} onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus as Lead['status'])}>
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge className={getStatusColor(lead.status)}>
                              {lead.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="negotiating">Negotiating</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                     <TableCell>
                       <Select value={lead.contact_status || 'lead'} onValueChange={(newStatus) => handleContactStatusChange(lead.id, newStatus)}>
                         <SelectTrigger className="w-36">
                           <SelectValue>
                             <span className="text-sm">{getContactStatusDisplay(lead.contact_status || 'lead')}</span>
                           </SelectValue>
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="lead">Not Contacted</SelectItem>
                           <SelectItem value="contacted">Contacted</SelectItem>
                           <SelectItem value="active_client">Active Client</SelectItem>
                           <SelectItem value="past_client">Past Client</SelectItem>
                         </SelectContent>
                       </Select>
                     </TableCell>
                     <TableCell>{lead.source}</TableCell>
                     <TableCell>
                       <LeadMeta lead={lead} layout="table" />
                     </TableCell>
                     <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <Dialog>
                           <DialogTrigger asChild>
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-8 w-8 p-0"
                               onClick={() => setSelectedLead(lead)}
                             >
                               <Eye className="w-4 h-4" />
                             </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Lead Details - {selectedLead?.name}</DialogTitle>
                          </DialogHeader>
                          {selectedLead && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Name</Label>
                                  <p className="font-medium">{selectedLead.name}</p>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <p>{selectedLead.email}</p>
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <p>{selectedLead.phone}</p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Badge className={getStatusColor(selectedLead.status)}>
                                    {selectedLead.status}
                                  </Badge>
                                </div>
                                <div>
                                  <Label>Priority</Label>
                                  <Badge variant="outline" className={getPriorityColor(selectedLead.priority)}>
                                    {selectedLead.priority}
                                  </Badge>
                                </div>
                                <div>
                                  <Label>Source</Label>
                                  <p>{selectedLead.source}</p>
                                </div>
                                <div className="col-span-2">
                                  <Label>Interest & Property Details</Label>
                                  <div className="mt-2">
                                    <LeadMeta lead={selectedLead as any} layout="card" />
                                  </div>
                                </div>
                              </div>
                              
                               <div>
                                 <Label>SLA & Assignment Status</Label>
                                 <div className="mt-2">
                                   <LeadSlaStatus lead={selectedLead} agentName={selectedLead.profiles?.name} />
                                 </div>
                               </div>

                               <div>
                                 <Label>Call Actions</Label>
                                 <div className="mt-2">
                                   <QuickCallActions lead={selectedLead} onComplete={fetchLeads} />
                                 </div>
                               </div>

                               <div>
                                 <Label>Notes</Label>
                                 <Textarea
                                   placeholder="Add notes about this lead..."
                                   className="mt-2"
                                   rows={4}
                                   defaultValue={selectedLead.notes}
                                 />
                               </div>

                               <div className="flex gap-2">
                                 <Button className="btn-primary">Save Changes</Button>
                                 <Button variant="outline">
                                   <Phone className="w-4 h-4 mr-2" />
                                   Call
                                 </Button>
                                 <Button variant="outline">
                                   <Mail className="w-4 h-4 mr-2" />
                                   Email
                                 </Button>
                                 <Button variant="outline">
                                   <MessageSquare className="w-4 h-4 mr-2" />
                                   WhatsApp
                                 </Button>
                               </div>
                            </div>
                           )}
                           </DialogContent>
                          </Dialog>
                          
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