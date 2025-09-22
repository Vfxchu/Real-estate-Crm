-- Create new enums for call outcomes
DO $$ BEGIN
  CREATE TYPE call_outcome AS ENUM (
    'interested','callback','no_answer','busy','not_interested','invalid','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table: call_attempts
CREATE TABLE IF NOT EXISTS public.call_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(user_id),
  outcome call_outcome NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_attempts_lead ON public.call_attempts(lead_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_attempts
CREATE POLICY "Agents can view their call attempts" ON public.call_attempts
FOR SELECT USING (
  agent_id = auth.uid() OR 
  lead_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])
);

CREATE POLICY "Agents can create call attempts" ON public.call_attempts
FOR INSERT WITH CHECK (
  agent_id = auth.uid() AND
  lead_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid())
);

-- Table: assignment_history
CREATE TABLE IF NOT EXISTS public.assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(user_id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  reason text,
  version int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assignment_hist_lead ON public.assignment_history(lead_id, assigned_at DESC);

-- Enable RLS
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment_history
CREATE POLICY "Agents can view assignment history" ON public.assignment_history
FOR SELECT USING (
  agent_id = auth.uid() OR 
  lead_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])
);

-- Column additions on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_version int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_outcome_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outcome text,
  ADD COLUMN IF NOT EXISTS outcome_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unreachable_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

-- BEFORE INSERT trigger: assign agent if null; stamp times
CREATE OR REPLACE FUNCTION public.tg_leads_before_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NEW.agent_id IS NULL THEN
    NEW.agent_id := public.get_least_busy_agent();
  END IF;
  NEW.assigned_at := now();
  NEW.last_assigned_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS leads_before_insert ON public.leads;
CREATE TRIGGER leads_before_insert
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_leads_before_insert();

-- AFTER INSERT trigger: start assignment_history row
CREATE OR REPLACE FUNCTION public.tg_leads_after_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.assignment_history(lead_id, agent_id, assigned_at, version)
  VALUES (NEW.id, NEW.agent_id, now(), NEW.assignment_version);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS leads_after_insert ON public.leads;
CREATE TRIGGER leads_after_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_leads_after_insert();

-- RPC to log an outcome (atomic + creates events)
CREATE OR REPLACE FUNCTION public.log_call_outcome(
  p_lead_id uuid,
  p_agent_id uuid,
  p_outcome call_outcome,
  p_notes text DEFAULT NULL,
  p_callback_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE 
  v_title text; 
  v_type text; 
  v_due timestamptz;
BEGIN
  -- write attempt
  INSERT INTO public.call_attempts(lead_id, agent_id, outcome, notes)
  VALUES (p_lead_id, p_agent_id, p_outcome, p_notes);

  -- lock ownership on FIRST outcome
  UPDATE public.leads
  SET first_outcome_at = COALESCE(first_outcome_at, now()),
      last_outcome = p_outcome::text,
      outcome_count = outcome_count + 1,
      last_contact_at = now(),
      agent_id = p_agent_id
  WHERE id = p_lead_id;

  -- outcome-specific status + events
  IF p_outcome = 'interested' THEN
    v_title := 'Schedule Meeting';
    v_type := 'contact_meeting';
    v_due := now() + interval '1 day';
    INSERT INTO public.calendar_events(title, event_type, start_date, lead_id, agent_id, description, created_by)
    VALUES (v_title, v_type, v_due, p_lead_id, p_agent_id, 'Lead interested – schedule meeting', p_agent_id);

    UPDATE public.leads SET status = 'contacted' WHERE id = p_lead_id;

  ELSIF p_outcome = 'callback' THEN
    v_title := 'Call Back';
    v_type := 'lead_call';
    v_due := COALESCE(p_callback_at, now() + interval '30 minutes');
    INSERT INTO public.calendar_events(title, event_type, start_date, lead_id, agent_id, description, created_by)
    VALUES (v_title, v_type, v_due, p_lead_id, p_agent_id, 'Callback requested', p_agent_id);

    UPDATE public.leads SET status = 'contacted' WHERE id = p_lead_id;

  ELSIF p_outcome IN ('no_answer','busy') THEN
    -- increment unreachable counter and schedule retry
    UPDATE public.leads
      SET unreachable_count = unreachable_count + 1
    WHERE id = p_lead_id;

    v_title := 'Call Retry';
    v_type := 'lead_call';
    v_due := CASE WHEN p_outcome = 'busy' THEN now() + interval '30 minutes'
                  ELSE now() + interval '2 hours' END;
    INSERT INTO public.calendar_events(title, event_type, start_date, lead_id, agent_id, description, created_by)
    VALUES (v_title, v_type, v_due, p_lead_id, p_agent_id, 'Auto-scheduled retry', p_agent_id);

    -- if 3 strikes → mark lost (No Response)
    UPDATE public.leads
      SET status = 'lost'
    WHERE id = p_lead_id
      AND (SELECT unreachable_count FROM public.leads WHERE id = p_lead_id) >= 3;

    UPDATE public.leads SET status = 'contacted' WHERE id = p_lead_id AND unreachable_count < 3;

  ELSIF p_outcome = 'not_interested' THEN
    UPDATE public.leads SET status = 'lost' WHERE id = p_lead_id;

  ELSIF p_outcome = 'invalid' THEN
    UPDATE public.leads SET status = 'lost' WHERE id = p_lead_id;
  END IF;

  -- activity log
  INSERT INTO public.activities(type, description, lead_id, created_by)
  VALUES ('call', concat('Outcome: ', p_outcome::text, COALESCE(' — '||p_notes,'')), p_lead_id, p_agent_id);
END; $$;

-- RPC for SLA reassign loop (30-min)
CREATE OR REPLACE FUNCTION public.reassign_overdue_leads(p_minutes int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE 
  r RECORD; 
  moved int := 0; 
  new_agent uuid;
BEGIN
  FOR r IN
    SELECT l.*
    FROM public.leads l
    WHERE l.first_outcome_at IS NULL
      AND l.assigned_at IS NOT NULL
      AND now() - l.assigned_at > make_interval(mins => p_minutes)
      AND l.status IN ('new','contacted')
  LOOP
    -- find next eligible agent
    SELECT public.get_least_busy_agent() INTO new_agent;
    IF new_agent IS NULL OR new_agent = r.agent_id THEN CONTINUE; END IF;

    -- close previous history row
    UPDATE public.assignment_history
      SET released_at = now(), reason = 'sla_breach'
    WHERE lead_id = r.id AND released_at IS NULL;

    -- bump version & reassign
    UPDATE public.leads
      SET agent_id = new_agent,
          assigned_at = now(),
          last_assigned_at = now(),
          assignment_version = assignment_version + 1
    WHERE id = r.id;

    INSERT INTO public.assignment_history(lead_id, agent_id, assigned_at, version)
    VALUES (r.id, new_agent, now(),
      (SELECT assignment_version FROM public.leads WHERE id = r.id));

    -- Create notification for new agent
    INSERT INTO public.notifications(user_id, title, message, type, priority, lead_id)
    VALUES (new_agent, 'Lead Reassigned', 
            CONCAT('Lead "', r.name, '" has been reassigned to you due to SLA breach'),
            'warning', 'high', r.id);

    moved := moved + 1;
  END LOOP;
  RETURN moved;
END; $$;