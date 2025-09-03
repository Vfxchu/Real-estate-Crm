-- Create calendar_events table for centralized event management
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('property_viewing', 'lead_call', 'contact_meeting', 'follow_up', 'general')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  
  -- Related entity IDs for sync
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  contact_id UUID, -- Can reference lead as contact
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  
  -- User management
  agent_id UUID NOT NULL DEFAULT auth.uid(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Notification fields
  reminder_minutes INTEGER DEFAULT 15,
  notification_sent BOOLEAN DEFAULT false,
  
  -- Recurring events support
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "calendar_events_select_own_or_admin" 
ON public.calendar_events 
FOR SELECT 
USING (
  agent_id = auth.uid() OR 
  created_by = auth.uid() OR 
  get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY "calendar_events_insert_own_or_admin" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (
  agent_id = auth.uid() OR 
  get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY "calendar_events_update_own_or_admin" 
ON public.calendar_events 
FOR UPDATE 
USING (
  agent_id = auth.uid() OR 
  created_by = auth.uid() OR 
  get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY "calendar_events_delete_own_or_admin" 
ON public.calendar_events 
FOR DELETE 
USING (
  agent_id = auth.uid() OR 
  created_by = auth.uid() OR 
  get_user_role_secure(auth.uid()) = 'admin'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  
  -- Related entities
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "notifications_select_own" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own" 
ON public.notifications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" 
ON public.notifications 
FOR DELETE 
USING (user_id = auth.uid());