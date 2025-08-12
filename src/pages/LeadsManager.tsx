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
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    await updateLead(leadId, { status: newStatus });
    await addActivity(leadId, 'status_change', `Status changed to ${newStatus}`);
  };

  const handleContactStatusToggle = async (leadId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'contacted' ? 'lead' : 'contacted';
    await updateLead(leadId, { contact_status: newStatus });
    await addActivity(leadId, 'contact_status_change', `Contact status changed to ${newStatus}`);
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
                         lead.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads Manager</h1>
          <p className="text-muted-foreground">
            Manage and track all your leads in one place
          </p>
        </div>
        <Button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Filters and Actions */}
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
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
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>

              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedLeads.length > 0 && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('assign')}
                >
                  Assign Agent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('status')}
                >
                  Change Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Contact Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
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
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={lead.contact_status === 'contacted' ? 'default' : 'outline'}
                        className="h-8"
                        onClick={() => handleContactStatusToggle(lead.id, lead.contact_status || 'lead')}
                      >
                        {lead.contact_status === 'contacted' ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Contacted
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Not Contacted
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>{lead.profiles?.name || 'Unassigned'}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            context="admin"
            onSuccess={async () => {
              await fetchLeads();
              setShowAddForm(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};