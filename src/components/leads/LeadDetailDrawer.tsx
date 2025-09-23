import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Edit, X, Phone, Mail, MessageSquare, Calendar,
  Building, MapPin, Clock, FileText, Activity, Users,
  Star, Tag, CheckCircle, AlertCircle, Download
} from 'lucide-react';
import { Lead } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLeads } from "@/hooks/useLeads";
import { LeadMeta } from "./LeadMeta";
import { LeadSlaStatus } from "./LeadSlaStatus";
import { QuickCallActions } from "./QuickCallActions";
import { supabase } from "@/integrations/supabase/client";

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface LeadActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by: string;
  profiles?: { name: string; email: string };
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
  description?: string;
  status?: string;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  open,
  onClose,
  onUpdate
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { updateLead, addActivity } = useLeads();
  const [editMode, setEditMode] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const canEdit = isAdmin || lead?.agent_id === user?.id;

  useEffect(() => {
    if (lead?.id && open) {
      setNotes(lead.notes || "");
      loadActivities();
      loadCalendarEvents();
    }
  }, [lead?.id, open]);

  const loadActivities = async () => {
    if (!lead?.id) return;
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id, type, description, created_at, created_by,
          profiles!activities_created_by_fkey(name, email)
        `)
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      console.error('Error loading activities:', error);
    }
  };

  const loadCalendarEvents = async () => {
    if (!lead?.id) return;
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_date, event_type, description, status')
        .eq('lead_id', lead.id)
        .order('start_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading calendar events:', error);
    }
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (!lead) return;
    
    const updateData: Partial<Lead> = { status: newStatus };
    
    // Auto-update contact_status based on lead status
    if (newStatus === 'contacted' || newStatus === 'qualified' || newStatus === 'negotiating') {
      updateData.contact_status = 'contacted';
    } else if (newStatus === 'won') {
      updateData.contact_status = 'active_client';
    } else if (newStatus === 'lost') {
      updateData.contact_status = 'past_client';
    } else if (newStatus === 'new') {
      updateData.contact_status = 'lead';
    }
    
    await updateLead(lead.id, updateData);
    await addActivity(lead.id, 'status_change', `Status changed to ${newStatus}`);
    onUpdate?.();
  };

  const handleContactStatusChange = async (newContactStatus: string) => {
    if (!lead) return;
    await updateLead(lead.id, { contact_status: newContactStatus });
    await addActivity(lead.id, 'contact_status_change', `Contact status changed to ${newContactStatus}`);
    onUpdate?.();
  };

  const handleNotesUpdate = async () => {
    if (!lead || !notes.trim()) return;
    
    setLoading(true);
    try {
      await updateLead(lead.id, { notes });
      await addActivity(lead.id, 'note', notes);
      toast({
        title: 'Notes updated',
        description: 'Lead notes have been saved successfully.',
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Error updating notes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const getContactStatusDisplay = (status: string) => {
    switch (status) {
      case 'lead': return 'Not Contacted';
      case 'contacted': return 'Contacted';
      case 'active_client': return 'Active Client';
      case 'past_client': return 'Past Client';
      default: return 'Not Contacted';
    }
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{lead.name}</span>
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                  {lead.priority} priority
                </Badge>
                {lead.profiles && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Avatar className="w-4 h-4">
                      <AvatarFallback className="text-xs">
                        {lead.profiles.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{lead.profiles.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {editMode ? 'Cancel' : 'Edit'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Pinned Action Bar */}
        <div className="p-4 border-b bg-muted/20 flex-shrink-0">
          <QuickCallActions 
            lead={lead} 
            onComplete={() => {
              loadActivities();
              loadCalendarEvents();
              onUpdate?.();
            }} 
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                  <TabsTrigger value="deals">Deals</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{lead.email}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{lead.phone || 'No phone'}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{lead.source}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{lead.category || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Interest & Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeadMeta lead={lead} layout="card" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder="Add notes about this lead..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="text-sm"
                      />
                      <Button 
                        onClick={handleNotesUpdate} 
                        disabled={loading || !notes.trim() || notes === (lead.notes || "")}
                        size="sm"
                      >
                        Save Notes
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activities" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4" />
                        Activity Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activities.length > 0 ? (
                        <div className="space-y-3">
                          {activities.map((activity) => (
                            <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-b-0">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium capitalize">{activity.type.replace('_', ' ')}</p>
                                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(activity.created_at).toLocaleString()}</span>
                                  {activity.profiles && (
                                    <>
                                      <span>•</span>
                                      <span>{activity.profiles.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No activities yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="calendar" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        Upcoming & Past Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {events.length > 0 ? (
                        <div className="space-y-3">
                          {events.map((event) => (
                            <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                              <Calendar className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{event.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(event.start_date).toLocaleString()}
                                </p>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {event.event_type}
                                  </Badge>
                                  {event.status && (
                                    <Badge variant={event.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                      {event.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No events scheduled</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="status" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">SLA & Assignment Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeadSlaStatus lead={lead} agentName={lead.profiles?.name} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Status Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Lead Status</Label>
                        <Select value={lead.status} onValueChange={handleStatusChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
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
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Contact Status</Label>
                        <Select value={lead.contact_status || 'lead'} onValueChange={handleContactStatusChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">Not Contacted</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="active_client">Active Client</SelectItem>
                            <SelectItem value="past_client">Past Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>Created: {new Date(lead.created_at).toLocaleString()}</span>
                        </div>
                        {lead.updated_at && (
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>Updated: {new Date(lead.updated_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="deals" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4" />
                        Linked Deals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No deals linked to this lead yet</p>
                        <Button variant="outline" size="sm" className="mt-4">
                          Create Deal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        {/* Footer with quick actions */}
        <div className="p-4 border-t bg-muted/20 flex-shrink-0">
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Lead ID: {lead.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};