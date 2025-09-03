-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.create_event_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix the get_calendar_events_with_details function
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
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
    (ce.agent_id = auth.uid() OR get_user_role_secure(auth.uid()) = 'admin')
    AND (start_date_param IS NULL OR ce.start_date >= start_date_param)
    AND (end_date_param IS NULL OR ce.start_date <= end_date_param)
  ORDER BY ce.start_date ASC;
END;
$$;