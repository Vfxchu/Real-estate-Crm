import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Phone, Mail, Building, User, Calendar } from 'lucide-react';
import { useActivities, type Activity } from '@/hooks/useActivities';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ContactActivitiesTabProps {
  contactId: string;
}

const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'note':
    case 'notes':
      return MessageSquare;
    case 'call':
    case 'phone':
      return Phone;
    case 'email':
      return Mail;
    case 'property_assignment':
    case 'property':
      return Building;
    case 'status_change':
    case 'lead_status':
      return User;
    case 'meeting':
    case 'appointment':
      return Calendar;
    default:
      return MessageSquare;
  }
};

const getActivityTypeLabel = (type: string) => {
  switch (type.toLowerCase()) {
    case 'note':
    case 'notes':
      return 'Note';
    case 'call':
    case 'phone':
      return 'Call';
    case 'email':
      return 'Email';
    case 'property_assignment':
    case 'property':
      return 'Property Assignment';
    case 'status_change':
    case 'lead_status':
      return 'Status Change';
    case 'meeting':
    case 'appointment':
      return 'Meeting';
    default:
      return type;
  }
};

const getActivityVariant = (type: string) => {
  switch (type.toLowerCase()) {
    case 'call':
    case 'phone':
      return 'default';
    case 'email':
      return 'secondary';
    case 'property_assignment':
    case 'property':
      return 'outline';
    case 'status_change':
    case 'lead_status':
      return 'destructive';
    case 'meeting':
    case 'appointment':
      return 'default';
    default:
      return 'outline';
  }
};

export default function ContactActivitiesTab({ contactId }: ContactActivitiesTabProps) {
  const { activities, loading, fetchActivities, addActivity } = useActivities();
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities({ contact_id: contactId });
  }, [contactId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addActivity({
        type: 'note',
        description: newNote.trim(),
        contact_id: contactId,
      });
      setNewNote('');
      // Refresh activities to get the latest
      fetchActivities({ contact_id: contactId });
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  const formatActivityDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  const contactActivities = activities.filter(activity => 
    activity.contact_id === contactId || activity.lead_id === contactId
  );

  return (
    <div className="space-y-4">
      {/* Add Note Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this contact..."
            rows={3}
          />
          <Button 
            onClick={handleAddNote}
            disabled={!newNote.trim() || isAddingNote}
            size="sm"
          >
            {isAddingNote ? 'Adding...' : 'Add Note'}
          </Button>
        </CardContent>
      </Card>

      {/* Activities Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading activities...
              </div>
            ) : contactActivities.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No activities yet. Add a note to get started.
              </div>
            ) : (
              <div className="space-y-1">
                {contactActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="border-b border-border/50 p-4 hover:bg-muted/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getActivityVariant(activity.type)} className="text-xs">
                              {getActivityTypeLabel(activity.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatActivityDate(activity.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground break-words">
                            {activity.description}
                          </p>
                          {activity.leads && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Related to: {activity.leads.name}
                            </div>
                          )}
                          {activity.properties && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Property: {activity.properties.title}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}