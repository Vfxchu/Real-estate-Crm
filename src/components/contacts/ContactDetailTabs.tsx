import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
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
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="w-full" orientation="horizontal">
      <ScrollArea className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} mb-4`}>
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            {isMobile ? 'Info' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="leads" className="text-xs sm:text-sm">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            {isMobile ? 'Leads' : 'Lead Inquiries'}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger value="activities" className="text-sm">
                <Activity className="w-4 h-4 mr-2" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="properties" className="text-sm">
                <Building className="w-4 h-4 mr-2" />
                Properties
              </TabsTrigger>
            </>
          )}
          {isMobile && (
            <TabsTrigger value="more" className="text-xs">
              <Building className="w-3 h-3 mr-1" />
              More
            </TabsTrigger>
          )}
        </TabsList>
      </ScrollArea>

      <ScrollArea className="h-full">
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`space-y-3 ${isMobile ? '' : 'grid grid-cols-2 gap-4 space-y-0'}`}>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.location_address || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {format(new Date(contact.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
              
              {/* Interest Tags */}
              {contact.interest_tags && contact.interest_tags.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {contact.interest_tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
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
                <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-4'}`}>
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

        <TabsContent value="leads" className="space-y-4 mt-0">
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
              ) : isMobile ? (
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <Card key={lead.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs">
                            {lead.status}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onEditLead?.(lead.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Source:</span> {lead.source || '-'}</div>
                          <div><span className="font-medium">Category:</span> <span className="capitalize">{lead.category || '-'}</span></div>
                          <div><span className="font-medium">Created:</span> {format(new Date(lead.created_at), 'MMM dd, yyyy')}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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

        {/* Mobile: Combined Activities & Properties */}
        {isMobile && (
          <TabsContent value="more" className="space-y-4 mt-0">
            {/* Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Communication History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No activities recorded</p>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 3).map((activity) => (
                      <div key={activity.id} className="border-l-2 border-primary pl-3 pb-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'MMM dd')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                    ))}
                    {activities.length > 3 && (
                      <p className="text-xs text-center text-muted-foreground">
                        +{activities.length - 3} more activities
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building className="h-4 w-4" />
                  Related Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No properties linked</p>
                ) : (
                  <div className="space-y-3">
                    {properties.slice(0, 3).map((property) => (
                      <Card key={property.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{property.title}</h4>
                              <p className="text-xs text-muted-foreground">{property.address}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 ml-2">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">AED {property.price?.toLocaleString()}</span>
                            <Badge variant="outline">{property.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {properties.length > 3 && (
                      <p className="text-xs text-center text-muted-foreground">
                        +{properties.length - 3} more properties
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Desktop: Separate tabs */}
        {!isMobile && (
          <>
            <TabsContent value="activities" className="space-y-4 mt-0">
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

            <TabsContent value="properties" className="space-y-4 mt-0">
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
          </>
        )}
      </ScrollArea>
    </Tabs>
  );
}