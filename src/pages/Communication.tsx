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
  Filter,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommunicationLog {
  id: string;
  leadName: string;
  agentName: string;
  type: 'email' | 'whatsapp' | 'call' | 'sms';
  subject?: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  leadId: string;
}

const mockCommunications: CommunicationLog[] = [
  {
    id: '1',
    leadName: 'John Smith',
    agentName: 'Sarah Johnson',
    type: 'email',
    subject: 'Welcome to Our Real Estate Services',
    message: 'Thank you for your interest in our properties...',
    status: 'read',
    timestamp: '2024-01-20 10:30',
    leadId: '1',
  },
  {
    id: '2',
    leadName: 'Maria Garcia',
    agentName: 'Mike Chen',
    type: 'whatsapp',
    message: 'Hi Maria! I saw you\'re interested in the 2BR condo. Would you like to schedule a viewing?',
    status: 'delivered',
    timestamp: '2024-01-20 14:15',
    leadId: '2',
  },
  {
    id: '3',
    leadName: 'David Wilson',
    agentName: 'Lisa Rodriguez',
    type: 'call',
    message: 'Discussed 4BR house requirements and budget',
    status: 'sent',
    timestamp: '2024-01-19 16:45',
    leadId: '3',
  },
];

export const Communication = () => {
  const [communications, setCommunications] = useState<CommunicationLog[]>(mockCommunications);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState({
    type: 'email',
    recipient: '',
    subject: '',
    message: '',
  });
  const { toast } = useToast();

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || comm.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || comm.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: CommunicationLog['type']) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: CommunicationLog['type']) => {
    switch (type) {
      case 'email': return 'bg-info text-info-foreground';
      case 'whatsapp': return 'bg-success text-success-foreground';
      case 'call': return 'bg-warning text-warning-foreground';
      case 'sms': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: CommunicationLog['status']) => {
    switch (status) {
      case 'sent': return <Clock className="w-4 h-4 text-warning" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-info" />;
      case 'read': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleSendMessage = () => {
    toast({
      title: 'Message sent',
      description: `${newMessage.type} message sent successfully`,
    });
    setNewMessage({ type: 'email', recipient: '', subject: '', message: '' });
  };

  const totalMessages = communications.length;
  const emailCount = communications.filter(c => c.type === 'email').length;
  const whatsappCount = communications.filter(c => c.type === 'whatsapp').length;
  const callCount = communications.filter(c => c.type === 'call').length;

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
                <p className="text-2xl font-bold">{totalMessages}</p>
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
                <p className="text-2xl font-bold">{emailCount}</p>
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
                <p className="text-2xl font-bold">{whatsappCount}</p>
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
                <p className="text-2xl font-bold">{callCount}</p>
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
                    {filteredCommunications.map((comm) => (
                      <TableRow key={comm.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {comm.leadName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{comm.leadName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{comm.agentName}</TableCell>
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
                        <TableCell>{comm.timestamp}</TableCell>
                      </TableRow>
                    ))}
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
                    onValueChange={(value) => setNewMessage(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recipient</Label>
                  <Input
                    placeholder="Select lead or enter contact"
                    value={newMessage.recipient}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, recipient: e.target.value }))}
                    className="mt-2"
                  />
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
                <Button onClick={handleSendMessage} className="btn-primary">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline">Save as Template</Button>
                <Button variant="outline">Schedule Send</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};