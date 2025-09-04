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
  get_current_user_role() = 'admin'
);

CREATE POLICY "calendar_events_insert_own_or_admin" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (
  agent_id = auth.uid() OR 
  get_current_user_role() = 'admin'
);

CREATE POLICY "calendar_events_update_own_or_admin" 
ON public.calendar_events 
FOR UPDATE 
USING (
  agent_id = auth.uid() OR 
  created_by = auth.uid() OR 
  get_current_user_role() = 'admin'
);

CREATE POLICY "calendar_events_delete_own_or_admin" 
ON public.calendar_events 
FOR DELETE 
USING (
  agent_id = auth.uid() OR 
  created_by = auth.uid() OR 
  get_current_user_role() = 'admin'
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

-- Create function to auto-create notifications for events
CREATE OR REPLACE FUNCTION public.create_event_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create reminder notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    priority,
    event_id,
    lead_id,
    property_id,
    deal_id,
    scheduled_for
  ) VALUES (
    NEW.agent_id,
    'Upcoming Event: ' || NEW.title,
    'You have an upcoming ' || NEW.event_type || ' scheduled for ' || 
    to_char(NEW.start_date, 'YYYY-MM-DD HH24:MI'),
    'reminder',
    CASE 
      WHEN NEW.event_type IN ('property_viewing', 'contact_meeting') THEN 'high'
      ELSE 'medium'
    END,
    NEW.id,
    NEW.lead_id,
    NEW.property_id,
    NEW.deal_id,
    NEW.start_date - INTERVAL '1 minute' * COALESCE(NEW.reminder_minutes, 15)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic notification creation
CREATE TRIGGER trigger_create_event_notification
  AFTER INSERT ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_event_notification();

-- Create function to update timestamps
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_calendar_events_agent_date ON public.calendar_events(agent_id, start_date);
CREATE INDEX idx_calendar_events_lead ON public.calendar_events(lead_id);
CREATE INDEX idx_calendar_events_property ON public.calendar_events(property_id);
CREATE INDEX idx_calendar_events_deal ON public.calendar_events(deal_id);
CREATE INDEX idx_notifications_user_scheduled ON public.notifications(user_id, scheduled_for);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- Create function to get event details with related data
CREATE OR REPLACE FUNCTION public.get_calendar_events_with_details(
  start_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_type TEXT,
  status TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  agent_id UUID,
  agent_name TEXT,
  lead_id UUID,
  lead_name TEXT,
  lead_email TEXT,
  property_id UUID,
  property_title TEXT,
  property_address TEXT,
  deal_id UUID,
  deal_title TEXT,
  reminder_minutes INTEGER,
  notification_sent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.event_type,
    ce.status,
    ce.start_date,
    ce.end_date,
    ce.location,
    ce.notes,
    ce.agent_id,
    p.name as agent_name,
    ce.lead_id,
    l.name as lead_name,
    l.email as lead_email,
    ce.property_id,
    pr.title as property_title,
    pr.address as property_address,
    ce.deal_id,
    d.title as deal_title,
    ce.reminder_minutes,
    ce.notification_sent
  FROM public.calendar_events ce
  LEFT JOIN public.profiles p ON ce.agent_id = p.user_id
  LEFT JOIN public.leads l ON ce.lead_id = l.id
  LEFT JOIN public.properties pr ON ce.property_id = pr.id
  LEFT JOIN public.deals d ON ce.deal_id = d.id
  WHERE 
    (ce.agent_id = auth.uid() OR get_current_user_role() = 'admin')
    AND (start_date_param IS NULL OR ce.start_date >= start_date_param)
    AND (end_date_param IS NULL OR ce.start_date <= end_date_param)
  ORDER BY ce.start_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;