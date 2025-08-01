import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLeads } from '@/hooks/useLeads';
import { AddLeadForm } from '@/components/forms/AddLeadForm';
import { EditLeadStatusForm } from '@/components/forms/EditLeadStatusForm';
import { WhatsAppFloatingButton } from '@/components/chat/WhatsAppFloatingButton';
import { WhatsAppChat } from '@/components/chat/WhatsAppChat';
import {
  Search,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'interested' | 'qualified' | 'closed' | 'lost';
  priority: 'low' | 'medium' | 'high';
  source: string;
  createdAt: string;
  lastContact?: string;
  nextFollowUp?: string;
  notes?: string;
  propertyInterest?: string;
  budget?: string;
  score?: number;
}

// Mock data for agent's leads
const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    status: 'new',
    priority: 'high',
    source: 'Website',
    createdAt: '2024-01-15',
    propertyInterest: '3BR House in Downtown',
    budget: '$300k-400k',
    score: 85,
  },
  {
    id: '2',
    name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+1 (555) 234-5678',
    status: 'contacted',
    priority: 'medium',
    source: 'Referral',
    createdAt: '2024-01-14',
    lastContact: '2024-01-16',
    nextFollowUp: '2024-01-20',
    propertyInterest: '2BR Condo near Beach',
    budget: '$200k-300k',
    score: 72,
  },
  {
    id: '3',
    name: 'David Wilson',
    email: 'david.wilson@email.com',
    phone: '+1 (555) 345-6789',
    status: 'interested',
    priority: 'high',
    source: 'Social Media',
    createdAt: '2024-01-13',
    lastContact: '2024-01-17',
    nextFollowUp: '2024-01-19',
    propertyInterest: '4BR House with Pool',
    budget: '$500k+',
    score: 90,
  },
];

export const MyLeads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { leads, loading } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addLeadFormOpen, setAddLeadFormOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedChatLead, setSelectedChatLead] = useState<{name: string, phone?: string} | null>(null);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-info text-info-foreground';
      case 'contacted': return 'bg-warning text-warning-foreground';
      case 'interested': return 'bg-primary text-primary-foreground';
      case 'qualified': return 'bg-success text-success-foreground';
      case 'closed': return 'bg-success text-success-foreground';
      case 'lost': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const handleAction = (action: string, leadId: string) => {
    toast({
      title: `${action} initiated`,
      description: `Action ${action} for lead ${leadId}`,
    });
  };

  const statusCounts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    interested: leads.filter(l => l.status === 'interested').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    closed: leads.filter(l => l.status === 'closed').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Leads</h1>
          <p className="text-muted-foreground">
            Track and manage your assigned leads
          </p>
        </div>
        <Button className="btn-primary" onClick={() => setAddLeadFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-info">{statusCounts.new}</div>
            <div className="text-sm text-muted-foreground">New</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{statusCounts.contacted}</div>
            <div className="text-sm text-muted-foreground">Contacted</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{statusCounts.interested}</div>
            <div className="text-sm text-muted-foreground">Interested</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{statusCounts.qualified}</div>
            <div className="text-sm text-muted-foreground">Qualified</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{statusCounts.closed}</div>
            <div className="text-sm text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
          <Card key={lead.id} className="card-elevated hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                </div>
                {lead.score && (
                  <div className={`text-sm font-bold ${getScoreColor(lead.score)}`}>
                    {lead.score}%
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <Badge variant="outline" className={
                  lead.priority === 'high' ? 'border-destructive text-destructive' :
                  lead.priority === 'medium' ? 'border-warning text-warning' :
                  'border-muted-foreground text-muted-foreground'
                }>
                  {lead.priority} priority
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{lead.propertyInterest}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Budget:</span>
                  <span>{lead.budget}</span>
                </div>
                {lead.nextFollowUp && (
                  <div className="flex items-center gap-2 text-warning">
                    <Clock className="w-4 h-4" />
                    <span>Follow up: {lead.nextFollowUp}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAction('call', lead.id)}
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAction('email', lead.id)}
                >
                  <Mail className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedChatLead({ name: lead.name, phone: lead.phone });
                    setChatOpen(true);
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedLead(lead)}
                    >
                      View
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
                            <Label>Contact Information</Label>
                            <div className="mt-2 space-y-1">
                              <p><strong>Email:</strong> {selectedLead.email}</p>
                              <p><strong>Phone:</strong> {selectedLead.phone}</p>
                            </div>
                          </div>
                          <div>
                            <Label>Lead Details</Label>
                            <div className="mt-2 space-y-1">
                              <p><strong>Source:</strong> {selectedLead.source}</p>
                              <p><strong>Score:</strong> {selectedLead.score}%</p>
                            </div>
                          </div>
                          <div>
                            <Label>Property Interest</Label>
                            <p className="mt-2">{selectedLead.propertyInterest}</p>
                          </div>
                          <div>
                            <Label>Budget</Label>
                            <p className="mt-2">{selectedLead.budget}</p>
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

                        <div>
                          <Label>Update Status</Label>
                          <Select defaultValue={selectedLead.status}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="interested">Interested</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="lost">Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2">
                          <Button className="btn-primary">Save Changes</Button>
                          <Button variant="outline">
                            <Phone className="w-4 h-4 mr-2" />
                            Call Now
                          </Button>
                          <Button variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {filteredLeads.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding your first lead'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Lead Form */}
      <AddLeadForm 
        open={addLeadFormOpen} 
        onOpenChange={setAddLeadFormOpen} 
      />

      {/* WhatsApp Chat */}
      {selectedChatLead && (
        <WhatsAppChat
          open={chatOpen}
          onOpenChange={setChatOpen}
          leadName={selectedChatLead.name}
          leadPhone={selectedChatLead.phone}
        />
      )}

      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton 
        onClick={() => {
          const demoLead = { name: 'John Smith', phone: '+1 (555) 123-4567' };
          setSelectedChatLead(demoLead);
          setChatOpen(true);
        }}
      />
    </div>
  );
};