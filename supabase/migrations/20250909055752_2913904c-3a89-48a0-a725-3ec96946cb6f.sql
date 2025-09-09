-- Create function to get calendar events with details
CREATE OR REPLACE FUNCTION public.get_calendar_events_with_details(
  start_date_param timestamp with time zone DEFAULT NULL,
  end_date_param timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  event_type text,
  status text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  location text,
  notes text,
  agent_id uuid,
  agent_name text,
  lead_id uuid,
  lead_name text,
  lead_email text,
  property_id uuid,
  property_title text,
  property_address text,
  deal_id uuid,
  deal_title text,
  reminder_minutes integer,
  notification_sent boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM calendar_events ce
  LEFT JOIN profiles p ON ce.agent_id = p.user_id
  LEFT JOIN leads l ON ce.lead_id = l.id
  LEFT JOIN properties pr ON ce.property_id = pr.id
  LEFT JOIN deals d ON ce.deal_id = d.id
  WHERE 
    (start_date_param IS NULL OR ce.start_date >= start_date_param)
    AND (end_date_param IS NULL OR ce.start_date <= end_date_param)
    AND (ce.agent_id = auth.uid() OR public.is_admin())
  ORDER BY ce.start_date ASC;
$$;

-- Create function to get least busy agent
CREATE OR REPLACE FUNCTION public.get_least_busy_agent()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM profiles p
  LEFT JOIN leads l ON p.user_id = l.agent_id AND l.status NOT IN ('won', 'lost')
  WHERE p.role = 'agent' AND p.status = 'active'
  GROUP BY p.user_id, p.created_at
  ORDER BY COUNT(l.id) ASC, p.created_at ASC
  LIMIT 1;
$$;