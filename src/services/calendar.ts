import { supabase } from "@/integrations/supabase/client";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  event_type: 'property_viewing' | 'lead_call' | 'contact_meeting' | 'follow_up' | 'general';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  start_date: string;
  end_date?: string;
  location?: string;
  notes?: string;
  lead_id?: string;
  property_id?: string;
  contact_id?: string;
  deal_id?: string;
  agent_id: string;
  created_by?: string;
  reminder_minutes?: number;
  notification_sent?: boolean;
  
  // Related data from joins
  agent_name?: string;
  lead_name?: string;
  lead_email?: string;
  property_title?: string;
  property_address?: string;
  deal_title?: string;
};

export type CreateCalendarEventPayload = {
  title: string;
  description?: string;
  event_type: CalendarEvent['event_type'];
  status?: CalendarEvent['status'];
  start_date: string;
  end_date?: string;
  location?: string;
  notes?: string;
  lead_id?: string;
  property_id?: string;
  contact_id?: string;
  deal_id?: string;
  agent_id?: string;
  reminder_minutes?: number;
};

export async function getCalendarEvents(startDate?: string, endDate?: string) {
  const { data, error } = await supabase.rpc('get_calendar_events_with_details', {
    start_date_param: startDate || null,
    end_date_param: endDate || null
  });
  
  return { data: data || [], error };
}

export async function createCalendarEvent(payload: CreateCalendarEventPayload) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  
  const eventData = {
    ...payload,
    agent_id: payload.agent_id || user?.id,
    created_by: user?.id,
  };

  const { data, error } = await supabase
    .from('calendar_events')
    .insert([eventData])
    .select()
    .single();
    
  return { data, error };
}

export async function updateCalendarEvent(id: string, payload: Partial<CreateCalendarEventPayload>) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
    
  return { data, error };
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);
    
  return { error };
}

// Notification functions
export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
    
  return { data: data || [], error };
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
    
  return { error };
}

export async function getUnreadNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false });
    
  return { data: data || [], error };
}

// Auto-sync functions for creating events from other modules
export async function createPropertyViewingEvent(propertyId: string, leadId: string, scheduledDate: string) {
  const { data: property } = await supabase
    .from('properties')
    .select('title, address')
    .eq('id', propertyId)
    .single();
    
  const { data: lead } = await supabase
    .from('leads')
    .select('name, email')
    .eq('id', leadId)
    .single();

  return createCalendarEvent({
    title: `Property Viewing: ${property?.title || 'Property'}`,
    description: `Property viewing appointment with ${lead?.name || 'Lead'}`,
    event_type: 'property_viewing',
    start_date: scheduledDate,
    location: property?.address,
    property_id: propertyId,
    lead_id: leadId,
    contact_id: leadId,
  });
}

export async function createLeadCallEvent(leadId: string, scheduledDate: string, notes?: string) {
  const { data: lead } = await supabase
    .from('leads')
    .select('name, email')
    .eq('id', leadId)
    .single();

  return createCalendarEvent({
    title: `Call: ${lead?.name || 'Lead'}`,
    description: `Follow-up call with lead`,
    event_type: 'lead_call',
    start_date: scheduledDate,
    lead_id: leadId,
    contact_id: leadId,
    notes,
  });
}

export async function createContactMeetingEvent(contactId: string, scheduledDate: string, location?: string, notes?: string) {
  const { data: contact } = await supabase
    .from('leads')
    .select('name, email')
    .eq('id', contactId)
    .single();

  return createCalendarEvent({
    title: `Meeting: ${contact?.name || 'Contact'}`,
    description: `Client meeting`,
    event_type: 'contact_meeting',
    start_date: scheduledDate,
    location,
    lead_id: contactId,
    contact_id: contactId,
    notes,
  });
}