import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Eye,
  Edit,
  Building,
  Activity,
  FileText
} from 'lucide-react';
import { Lead } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContacts } from '@/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ContactDetailTabsProps {
  contact: Lead;
  onEditLead?: (leadId: string) => void;
}

interface ContactLead {
  id: string;
  status: string;
  source: string;
  category: string;
  created_at: string;
  notes: string;
  interested_in: string;
  budget_range: string;
}

interface ContactActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by: string;
}

interface ContactProperty {
  id: string;
  title: string;
  address: string;
  price: number;
  status: string;
  created_at: string;
}

export default function ContactDetailTabs({ contact, onEditLead }: ContactDetailTabsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getContactLeads, getActivities } = useContacts();
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [properties, setProperties] = useState<ContactProperty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContactData();
  }, [contact.id]);

  const loadContactData = async () => {
    setLoading(true);
    try {
      // Load leads for this contact
      const { data: leadsData, error: leadsError } = await getContactLeads(contact.id);
      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      // Load activities for this contact
      const { data: activitiesData, error: activitiesError } = await getActivities(contact.id);
      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load properties related to this contact (viewings, inquiries, etc.)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, address, price, status, created_at')
        .eq('agent_id', user?.id)
        .limit(10);
      
      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: 'Failed to load contact data: ' + error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'secondary';
      case 'contacted': return 'default';
      case 'qualified': return 'secondary';
      case 'negotiating': return 'outline';
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="leads">
          Leads {leads.length > 0 && <Badge variant="secondary" className="ml-1">{leads.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="activities">
          Activities {activities.length > 0 && <Badge variant="secondary" className="ml-1">{activities.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="properties">
          Properties {properties.length > 0 && <Badge variant="secondary" className="ml-1">{properties.length}</Badge>}
        </TabsTrigger>
      </TabsList>

      <ScrollArea className="h-[600px] mt-4">
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contact.name || 'Unknown'}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.location_address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.location_address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={contact.contact_status === 'lead' ? 'secondary' : 'default'}>
                      {contact.contact_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Created:</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(contact.created_at!), 'PPP')}
                    </span>
                  </div>
                  {contact.interest_tags && contact.interest_tags.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Interests:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.interest_tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {contact.notes && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                    {contact.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Requirements */}
          {(contact.segment || contact.subtype || contact.bedrooms || contact.budget_sale_band || contact.budget_rent_band) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Property Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {contact.segment && (
                    <div className="flex justify-between">
                      <span className="font-medium">Segment:</span>
                      <span className="capitalize">{contact.segment}</span>
                    </div>
                  )}
                  {contact.subtype && (
                    <div className="flex justify-between">
                      <span className="font-medium">Type:</span>
                      <span>{contact.subtype}</span>
                    </div>
                  )}
                  {contact.bedrooms && (
                    <div className="flex justify-between">
                      <span className="font-medium">Bedrooms:</span>
                      <span>{contact.bedrooms}</span>
                    </div>
                  )}
                  {contact.budget_sale_band && (
                    <div className="flex justify-between">
                      <span className="font-medium">Sale Budget:</span>
                      <span>{contact.budget_sale_band}</span>
                    </div>
                  )}
                  {contact.budget_rent_band && (
                    <div className="flex justify-between">
                      <span className="font-medium">Rent Budget:</span>
                      <span>{contact.budget_rent_band}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lead Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No lead inquiries found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(lead.status)}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{lead.source || '-'}</TableCell>
                        <TableCell className="capitalize">{lead.category || '-'}</TableCell>
                        <TableCell>{format(new Date(lead.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => onEditLead?.(lead.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activities recorded</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-primary pl-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{activity.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm">{activity.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Related Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No properties linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.title}</TableCell>
                        <TableCell>{property.address}</TableCell>
                        <TableCell>AED {property.price?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{property.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}