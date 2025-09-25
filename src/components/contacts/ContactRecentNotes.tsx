import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ContactRecentNotesProps {
  contactId: string;
}

interface NoteActivity {
  id: string;
  description: string;
  created_at: string;
  created_by: string;
  profiles?: {
    name: string;
  };
}

export default function ContactRecentNotes({ contactId }: ContactRecentNotesProps) {
  const [notes, setNotes] = useState<NoteActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentNotes();
  }, [contactId]);

  const loadRecentNotes = async () => {
    if (!contactId) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          description,
          created_at,
          created_by,
          profiles!activities_created_by_fkey(name)
        `)
        .eq('lead_id', contactId)
        .eq('type', 'note')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Failed to load recent notes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Recent Notes</h4>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Recent Notes</h4>
        <p className="text-xs text-muted-foreground">No notes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Recent Notes</h4>
        {notes.length >= 3 && (
          <Button variant="ghost" size="sm" className="text-xs h-auto p-1">
            View all
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-sm">{note.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(note.created_at), 'MMM dd, HH:mm')}</span>
              {note.profiles && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{note.profiles.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}