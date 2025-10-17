import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Send,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useCommunications } from '@/hooks/useCommunications';
import { useLeads } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { SearchableContactCombobox } from '@/components/ui/SearchableContactCombobox';

export const Communication = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState({
    type: 'email' as 'email' | 'whatsapp' | 'call' | 'sms',
    leadId: '',
    subject: '',
    message: '',
  });

  const { communications, stats, loading, sendMessage } = useCommunications({
    type: typeFilter,
    status: statusFilter,
  });
  const { leads } = useLeads();

  const filteredCommunications = communications.filter(comm => {
    const leadName = comm.leads?.name || comm.contacts?.full_name || 'Unknown';
    const agentName = comm.profiles?.name || 'Unknown';
    const matchesSearch = leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getTypeIcon = (type: 'email' | 'whatsapp' | 'call' | 'sms' | 'meeting') => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: 'email' | 'whatsapp' | 'call' | 'sms' | 'meeting') => {
    switch (type) {
      case 'email': return 'bg-info text-info-foreground';
      case 'whatsapp': return 'bg-success text-success-foreground';
      case 'call': return 'bg-warning text-warning-foreground';
      case 'sms': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: 'sent' | 'delivered' | 'read' | 'failed') => {
    switch (status) {
      case 'sent': return <Clock className="w-4 h-4 text-warning" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-info" />;
      case 'read': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.leadId || !newMessage.message) {
      return;
    }

    try {
      await sendMessage({
        lead_id: newMessage.leadId,
        type: newMessage.type,
        subject: newMessage.subject || undefined,
        message: newMessage.message,
      });
      setNewMessage({ type: 'email', leadId: '', subject: '', message: '' });
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Communication Center</h1>
          <p className="text-muted-foreground">
            Manage all your client communications in one place
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Emails</p>
                <p className="text-2xl font-bold">{stats.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                <p className="text-2xl font-bold">{stats.whatsapp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Phone className="w-8 h-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Calls</p>
                <p className="text-2xl font-bold">{stats.call}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Communication History</TabsTrigger>
          <TabsTrigger value="compose">Compose Message</TabsTrigger>
        </TabsList>

        {/* Communication History */}
        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search communications..."
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
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communications Table */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Communication History ({filteredCommunications.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading communications...
                        </TableCell>
                      </TableRow>
                    ) : filteredCommunications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No communications found. Send your first message!
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommunications.map((comm) => {
                        const leadName = comm.leads?.name || comm.contacts?.full_name || 'Unknown';
                        const agentName = comm.profiles?.name || 'Unknown';
                        
                        return (
                          <TableRow key={comm.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {leadName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{leadName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{agentName}</TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(comm.type)}>
                                <div className="flex items-center gap-1">
                                  {getTypeIcon(comm.type)}
                                  {comm.type}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                {comm.subject && (
                                  <p className="font-medium text-sm mb-1">{comm.subject}</p>
                                )}
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {comm.message}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(comm.status)}
                                <span className="capitalize">{comm.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>{format(new Date(comm.created_at), 'PPp')}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compose Message */}
        <TabsContent value="compose" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Compose New Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Message Type</Label>
                  <Select
                    value={newMessage.type}
                    onValueChange={(value) => setNewMessage(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="call">Call Log</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lead / Contact</Label>
                  <Select
                    value={newMessage.leadId}
                    onValueChange={(value) => setNewMessage(prev => ({ ...prev, leadId: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} - {lead.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newMessage.type === 'email' && (
                <div>
                  <Label>Subject</Label>
                  <Input
                    placeholder="Email subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={newMessage.message}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                  className="mt-2"
                  rows={6}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMessage} 
                  className="btn-primary"
                  disabled={!newMessage.leadId || !newMessage.message || loading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};