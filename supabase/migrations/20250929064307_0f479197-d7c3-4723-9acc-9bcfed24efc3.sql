-- Create missing lookup tables and workflow infrastructure
-- All operations are idempotent

-- 1. Create invalid_reasons lookup table
CREATE TABLE IF NOT EXISTS public.invalid_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed invalid reasons if not exists
INSERT INTO public.invalid_reasons (label) VALUES
  ('Developer'),
  ('Agent'),
  ('Marketing'),
  ('Job Request'),
  ('Test/Junk Data'),
  ('Incorrect Contact Details'),
  ('Existing Client'),
  ('Only Researching/Browsing'),
  ('No Answer After Multiple Attempts')
ON CONFLICT (label) DO NOTHING;

-- 2. Create deal_lost_reasons lookup table
CREATE TABLE IF NOT EXISTS public.deal_lost_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed deal lost reasons if not exists
INSERT INTO public.deal_lost_reasons (label) VALUES
  ('Property Not Available'),
  ('Seller Backed Out'),
  ('Financing Issues'),
  ('Lost to Competitor'),
  ('Legal/Compliance Issue'),
  ('Could Not Find Suitable Property'),
  ('No Answer After Multiple Attempts'),
  ('Offer Rejected (Client Will Not Raise)'),
  ('Budget Too Low')
ON CONFLICT (label) DO NOTHING;

-- 3. Create lead_outcomes table for tracking outcomes and idempotency
CREATE TABLE IF NOT EXISTS public.lead_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  outcome TEXT NOT NULL,
  reason_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);

-- Index for lead outcomes
CREATE INDEX IF NOT EXISTS ix_lead_outcomes_lead ON public.lead_outcomes(lead_id);

-- Unique index for one-time outcomes (Interested, Under Offer)
CREATE UNIQUE INDEX IF NOT EXISTS ix_lead_outcomes_once 
ON public.lead_outcomes(lead_id, outcome) 
WHERE outcome IN ('Interested','Under Offer');

-- 4. Create tasks table if not exists
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  type TEXT NOT NULL DEFAULT 'follow_up',
  origin TEXT NOT NULL DEFAULT 'manual',
  lead_id UUID NULL,
  assigned_to UUID NOT NULL DEFAULT auth.uid(),
  calendar_event_id UUID NULL,
  sync_origin TEXT NULL, -- 'task' or 'calendar' to prevent sync loops
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS ix_tasks_lead ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS ix_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS ix_tasks_due ON public.tasks(due_at);

-- Unique index for auto follow-up tasks (one per lead)
CREATE UNIQUE INDEX IF NOT EXISTS ix_tasks_auto_followup_unique 
ON public.tasks(lead_id) 
WHERE (origin='auto_followup' AND status IN ('Open','ToDo'));

-- 5. Add recurrence support to calendar_events if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'calendar_events' 
                 AND column_name = 'recurrence_data') THEN
    ALTER TABLE public.calendar_events ADD COLUMN recurrence_data JSONB NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'calendar_events' 
                 AND column_name = 'task_id') THEN
    ALTER TABLE public.calendar_events ADD COLUMN task_id UUID NULL;
  END IF;
END $$;

-- 6. Central workflow RPC
CREATE OR REPLACE FUNCTION public.apply_followup_outcome(
  p_lead_id UUID,
  p_outcome TEXT,
  p_due_at TIMESTAMPTZ,
  p_title TEXT DEFAULT NULL,
  p_reason_id UUID DEFAULT NULL,
  p_client_still_with_us BOOLEAN DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS TABLE(new_stage TEXT, task_id UUID, calendar_event_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stage TEXT;
  v_new_stage TEXT;
  v_stage_column TEXT;
  v_task_id UUID;
  v_event_id UUID;
  v_task_title TEXT;
  v_lead_agent UUID;
  v_lead_name TEXT;
BEGIN
  -- Detect stage column (prefer 'stage', fallback to 'status')
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'stage') 
    THEN 'stage'
    ELSE 'status'
  END INTO v_stage_column;
  
  -- Get current lead info
  EXECUTE format('SELECT %I, agent_id, name FROM leads WHERE id = $1', v_stage_column)
    USING p_lead_id INTO v_current_stage, v_lead_agent, v_lead_name;
    
  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  -- Validate visibility rules
  IF v_current_stage = 'contacted' AND p_outcome IN ('Under Offer', 'Deal Won', 'Deal Lost') THEN
    RAISE EXCEPTION 'Outcome % not available in % stage', p_outcome, v_current_stage;
  END IF;
  
  IF p_outcome = 'Deal Won' AND v_current_stage != 'under offer' THEN
    RAISE EXCEPTION 'Deal Won only available in Under Offer stage, current: %', v_current_stage;
  END IF;

  -- Require reasons for Invalid and Deal Lost
  IF p_outcome IN ('Invalid', 'Deal Lost') AND p_reason_id IS NULL THEN
    RAISE EXCEPTION 'Reason required for outcome: %', p_outcome;
  END IF;

  -- Apply stage transitions
  v_new_stage := CASE p_outcome
    WHEN 'Interested' THEN 'qualified'
    WHEN 'Meeting Scheduled' THEN 'qualified'
    WHEN 'Under Offer' THEN 'under offer'
    WHEN 'Deal Won' THEN 'won'
    WHEN 'Deal Lost' THEN 
      CASE WHEN COALESCE(p_client_still_with_us, false) THEN 'new' ELSE 'lost' END
    WHEN 'Invalid' THEN 'invalid'
    WHEN 'Call Back Request' THEN 'contacted'
    WHEN 'No Answer' THEN 'contacted'
    ELSE v_current_stage
  END;

  -- Update lead stage
  EXECUTE format('UPDATE leads SET %I = $1, updated_at = now() WHERE id = $2', v_stage_column)
    USING v_new_stage, p_lead_id;

  -- Set task title
  v_task_title := COALESCE(p_title, 
    CASE p_outcome
      WHEN 'Deal Won' THEN 'Handover: docs & keys'
      WHEN 'Deal Lost' THEN 
        CASE WHEN COALESCE(p_client_still_with_us, false) 
        THEN 'Fresh follow-up with ' || v_lead_name
        ELSE 'Close-out follow-up'
        END
      WHEN 'Invalid' THEN 'Close-out follow-up'
      ELSE 'Follow up with ' || v_lead_name
    END
  );

  -- Create follow-up task
  INSERT INTO tasks (
    title, due_at, type, origin, lead_id, assigned_to, sync_origin, created_by
  ) VALUES (
    v_task_title, p_due_at, 'follow_up', 'manual_followup', 
    p_lead_id, v_lead_agent, 'task', auth.uid()
  ) RETURNING id INTO v_task_id;

  -- Create linked calendar event
  INSERT INTO calendar_events (
    title, start_date, end_date, event_type, lead_id, agent_id, 
    task_id, reminder_offset_min, created_by
  ) VALUES (
    v_task_title, p_due_at, p_due_at + interval '1 hour', 'follow_up',
    p_lead_id, v_lead_agent, v_task_id, 0, auth.uid()
  ) RETURNING id INTO v_event_id;

  -- Link calendar event to task
  UPDATE tasks SET calendar_event_id = v_event_id WHERE id = v_task_id;

  -- Record outcome
  INSERT INTO lead_outcomes (lead_id, outcome, reason_id, notes, created_by)
  VALUES (p_lead_id, p_outcome, p_reason_id, p_notes, auth.uid());

  -- Log activity
  INSERT INTO activities (type, description, lead_id, created_by)
  VALUES ('outcome', 
    format('Follow-up outcome: %s → %s stage%s', 
      p_outcome, v_new_stage,
      CASE WHEN p_notes IS NOT NULL THEN ' • ' || p_notes ELSE '' END
    ), 
    p_lead_id, auth.uid()
  );

  RETURN QUERY SELECT v_new_stage, v_task_id, v_event_id;
END;
$$;

-- 7. Manual follow-up RPC
CREATE OR REPLACE FUNCTION public.ensure_manual_followup(
  p_lead_id UUID,
  p_due_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc') + interval '1 hour',
  p_title TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_event_id UUID;
  v_lead_agent UUID;
  v_lead_name TEXT;
  v_final_title TEXT;
BEGIN
  -- Get lead info
  SELECT agent_id, name INTO v_lead_agent, v_lead_name
  FROM leads WHERE id = p_lead_id;
  
  IF v_lead_agent IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  v_final_title := COALESCE(p_title, 'Follow up with ' || v_lead_name);

  -- Create task
  INSERT INTO tasks (
    title, due_at, type, origin, lead_id, assigned_to, sync_origin, created_by
  ) VALUES (
    v_final_title, p_due_at, 'follow_up', 'manual_followup',
    p_lead_id, v_lead_agent, 'task', auth.uid()
  ) RETURNING id INTO v_task_id;

  -- Create calendar event
  INSERT INTO calendar_events (
    title, start_date, end_date, event_type, lead_id, agent_id,
    task_id, reminder_offset_min, created_by
  ) VALUES (
    v_final_title, p_due_at, p_due_at + interval '1 hour', 'follow_up',
    p_lead_id, v_lead_agent, v_task_id, 0, auth.uid()
  ) RETURNING id INTO v_event_id;

  -- Link them
  UPDATE tasks SET calendar_event_id = v_event_id WHERE id = v_task_id;

  RETURN v_task_id;
END;
$$;

-- 8. Auto follow-up on new lead trigger
CREATE OR REPLACE FUNCTION public.create_auto_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_event_id UUID;
  v_due_at TIMESTAMPTZ;
BEGIN
  v_due_at := NEW.created_at + interval '1 hour';
  
  -- Create auto follow-up task
  INSERT INTO tasks (
    title, due_at, type, origin, lead_id, assigned_to, sync_origin, created_by
  ) VALUES (
    'Follow up with ' || NEW.name, v_due_at, 'follow_up', 'auto_followup',
    NEW.id, NEW.agent_id, 'task', NEW.agent_id
  ) RETURNING id INTO v_task_id;

  -- Create calendar event
  INSERT INTO calendar_events (
    title, start_date, end_date, event_type, lead_id, agent_id,
    task_id, reminder_offset_min, created_by
  ) VALUES (
    'Follow up with ' || NEW.name, v_due_at, v_due_at + interval '1 hour', 'follow_up',
    NEW.id, NEW.agent_id, v_task_id, 0, NEW.agent_id
  ) RETURNING id INTO v_event_id;

  -- Link them
  UPDATE tasks SET calendar_event_id = v_event_id WHERE id = v_task_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If task creation fails, lead creation should fail
  RAISE EXCEPTION 'Failed to create auto follow-up task: %', SQLERRM;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS tg_leads_auto_followup ON leads;
CREATE TRIGGER tg_leads_auto_followup
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION create_auto_followup();

-- 9. Two-way sync triggers for tasks and calendar_events
CREATE OR REPLACE FUNCTION public.sync_task_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if change came from task (prevent loops)
  IF NEW.sync_origin = 'task' AND NEW.calendar_event_id IS NOT NULL THEN
    UPDATE calendar_events 
    SET 
      title = NEW.title,
      start_date = NEW.due_at,
      end_date = NEW.due_at + interval '1 hour'
    WHERE id = NEW.calendar_event_id;
  END IF;
  
  -- Reset sync origin
  NEW.sync_origin := NULL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_calendar_to_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if task_id is present and change didn't come from task
  IF NEW.task_id IS NOT NULL AND 
     (OLD.title IS DISTINCT FROM NEW.title OR OLD.start_date IS DISTINCT FROM NEW.start_date) THEN
    UPDATE tasks 
    SET 
      title = NEW.title,
      due_at = NEW.start_date,
      sync_origin = 'calendar'
    WHERE id = NEW.task_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create sync triggers
DROP TRIGGER IF EXISTS tg_sync_task_to_calendar ON tasks;
CREATE TRIGGER tg_sync_task_to_calendar
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_calendar();

DROP TRIGGER IF EXISTS tg_sync_calendar_to_task ON calendar_events;
CREATE TRIGGER tg_sync_calendar_to_task
  AFTER UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_calendar_to_task();

-- Enable RLS on new tables
ALTER TABLE public.invalid_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_lost_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for lookup tables (read-only for authenticated users)
CREATE POLICY "Allow read invalid_reasons" ON public.invalid_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read deal_lost_reasons" ON public.deal_lost_reasons FOR SELECT TO authenticated USING (true);

-- RLS policies for lead_outcomes
CREATE POLICY "Users can view related lead outcomes" ON public.lead_outcomes 
FOR SELECT USING (
  lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Users can create lead outcomes" ON public.lead_outcomes 
FOR INSERT WITH CHECK (
  lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

-- RLS policies for tasks
CREATE POLICY "Users can view assigned tasks" ON public.tasks 
FOR SELECT USING (
  assigned_to = auth.uid() OR
  lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Users can create tasks" ON public.tasks 
FOR INSERT WITH CHECK (
  assigned_to = auth.uid() OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Users can update assigned tasks" ON public.tasks 
FOR UPDATE USING (
  assigned_to = auth.uid() OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Users can delete assigned tasks" ON public.tasks 
FOR DELETE USING (
  assigned_to = auth.uid() OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;