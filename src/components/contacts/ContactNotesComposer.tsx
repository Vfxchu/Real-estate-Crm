import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContactNotesComposerProps {
  contactId: string;
  onNoteAdded?: () => void;
}

export default function ContactNotesComposer({ contactId, onNoteAdded }: ContactNotesComposerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveNote = async () => {
    if (!note.trim() || !user?.id) return;

    setSaving(true);
    try {
      // Add as activity
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          lead_id: contactId,
          type: 'note',
          description: note.trim(),
          created_by: user.id
        });

      if (activityError) throw activityError;

      // Update lead notes field as well
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          notes: note.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (updateError) throw updateError;

      toast({
        title: 'Note saved',
        description: 'Your note has been added successfully.'
      });

      setNote('');
      onNoteAdded?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save note: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-none bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Quick Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Add a quick note about this contact..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[80px] text-sm"
          disabled={saving}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSaveNote}
            disabled={!note.trim() || saving}
            size="sm"
            className="gap-1"
          >
            <Send className="h-3 w-3" />
            {saving ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}