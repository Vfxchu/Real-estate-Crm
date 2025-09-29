-- Align outcome workflow with terminal stop conditions and idempotency
-- 1) apply_followup_outcome: allow Deal Won/Lost/Invalid at any stage, create closure task for Lost/Invalid, none for Won
CREATE OR REPLACE FUNCTION public.apply_followup_outcome(
  p_lead_id uuid, 
  p_outcome text, 
  p_due_at timestamp with time zone, 
  p_title text DEFAULT NULL::text, 
  p_reason_id uuid DEFAULT NULL::uuid, 
  p_client_still_with_us boolean DEFAULT NULL::boolean, 
  p_notes text DEFAULT NULL::text
)
RETURNS TABLE(new_stage text, task_id uuid, calendar_event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_should_create_task BOOLEAN := true;
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

  -- Determine if we should create a task
  v_should_create_task := CASE p_outcome
    WHEN 'Deal Won' THEN false  -- No task for Deal Won
    WHEN 'Deal Lost' THEN 
      -- Only create closure task if not restarting workflow
      NOT COALESCE(p_client_still_with_us, false)
    WHEN 'Invalid' THEN true  -- Create closure task for Invalid
    ELSE true  -- Create regular follow-up task for other outcomes
  END;

  -- Create task only if needed
  IF v_should_create_task THEN
    -- Set task title
    v_task_title := COALESCE(p_title, 
      CASE p_outcome
        WHEN 'Deal Lost' THEN 'Close-out follow-up'
        WHEN 'Invalid' THEN 'Close-out follow-up'
        ELSE 'Follow up with ' || v_lead_name
      END
    );

    -- Create follow-up or closure task
    INSERT INTO tasks (
      title, due_at, type, origin, lead_id, assigned_to, sync_origin, created_by
    ) VALUES (
      v_task_title, p_due_at, 'follow_up', 
      CASE WHEN p_outcome IN ('Deal Lost', 'Invalid') THEN 'closure' ELSE 'manual_followup' END,
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
  END IF;

  -- Record outcome
  INSERT INTO lead_outcomes (lead_id, outcome, reason_id, notes, created_by)
  VALUES (p_lead_id, p_outcome, p_reason_id, p_notes, auth.uid());

  -- Log activity
  INSERT INTO activities (type, description, lead_id, created_by)
  VALUES ('outcome', 
    format('Follow-up outcome: %s → %s stage%s%s', 
      p_outcome, v_new_stage,
      CASE WHEN p_notes IS NOT NULL THEN ' • ' || p_notes ELSE '' END,
      CASE WHEN NOT v_should_create_task THEN ' • Workflow completed' ELSE '' END
    ), 
    p_lead_id, auth.uid()
  );

  RETURN QUERY SELECT v_new_stage, v_task_id, v_event_id;
END;
$$;

-- 2) complete_task_with_auto_followup: never spawn follow-ups for closure tasks or terminal stages;
--    prevent duplicates by checking any open follow_up; next due in 15 minutes
CREATE OR REPLACE FUNCTION public.complete_task_with_auto_followup(
  p_task_id uuid, 
  p_auto_next_hours integer DEFAULT 1
)
RETURNS TABLE(completed_task_id uuid, next_task_id uuid, next_event_id uuid, lead_stage text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD;
  v_lead RECORD;
  v_stage_column TEXT;
  v_current_stage TEXT;
  v_should_create_next BOOLEAN := false;
  v_next_task_id UUID;
  v_next_event_id UUID;
  v_next_due_at TIMESTAMPTZ;
  v_next_title TEXT;
BEGIN
  -- Get task details with lead info
  SELECT t.*, l.agent_id as lead_agent_id, l.name as lead_name
  INTO v_task
  FROM tasks t
  LEFT JOIN leads l ON l.id = t.lead_id
  WHERE t.id = p_task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  -- Detect stage column (prefer 'stage', fallback to 'status')
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'stage') 
    THEN 'stage'
    ELSE 'status'
  END INTO v_stage_column;

  -- Get current lead stage
  IF v_task.lead_id IS NOT NULL THEN
    EXECUTE format('SELECT %I FROM leads WHERE id = $1', v_stage_column)
      USING v_task.lead_id INTO v_current_stage;
  END IF;

  -- Mark task as completed
  UPDATE tasks 
  SET status = 'Completed', updated_at = now()
  WHERE id = p_task_id;

  -- Update linked calendar event if exists
  IF v_task.calendar_event_id IS NOT NULL THEN
    UPDATE calendar_events 
    SET status = 'completed'
    WHERE id = v_task.calendar_event_id;
  END IF;

  -- Determine if we should create next follow-up based on stage AND task origin
  v_should_create_next := CASE 
    WHEN v_task.origin = 'closure' THEN false  -- Closure tasks never generate new follow-ups
    WHEN v_current_stage IN ('won', 'lost', 'invalid') THEN false  -- Terminal stages
    WHEN v_current_stage IN ('new', 'contacted', 'qualified', 'under offer', 'negotiating') THEN true
    ELSE true
  END;

  -- Prevent duplicates: if any open follow_up exists for this lead, do not create another
  IF v_should_create_next AND v_task.lead_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM tasks 
      WHERE lead_id = v_task.lead_id 
        AND type = 'follow_up'
        AND status IN ('Open','ToDo')
    ) THEN
      v_should_create_next := false;
    END IF;
  END IF;

  -- Create next follow-up task if appropriate
  IF v_should_create_next AND v_task.lead_id IS NOT NULL THEN
    v_next_due_at := now() + make_interval(mins => 15);
    v_next_title := 'Follow up with ' || COALESCE(v_task.lead_name, 'lead');

    INSERT INTO tasks (
      title, due_at, type, origin, lead_id, assigned_to, 
      sync_origin, created_by
    ) VALUES (
      v_next_title, v_next_due_at, 'follow_up', 'auto_followup',
      v_task.lead_id, COALESCE(v_task.lead_agent_id, v_task.assigned_to), 
      'task', auth.uid()
    ) RETURNING id INTO v_next_task_id;

    INSERT INTO calendar_events (
      title, start_date, end_date, event_type, lead_id, agent_id,
      task_id, reminder_offset_min, created_by
    ) VALUES (
      v_next_title, v_next_due_at, v_next_due_at + interval '1 hour', 'follow_up',
      v_task.lead_id, COALESCE(v_task.lead_agent_id, v_task.assigned_to),
      v_next_task_id, 0, auth.uid()
    ) RETURNING id INTO v_next_event_id;

    UPDATE tasks SET calendar_event_id = v_next_event_id WHERE id = v_next_task_id;
  END IF;

  -- Log completion activity
  INSERT INTO activities (type, description, lead_id, created_by)
  VALUES (
    'task_completed', 
    format('Task completed: "%s"%s', 
      v_task.title,
      CASE 
        WHEN v_next_task_id IS NOT NULL THEN ' • Next follow-up auto-created' 
        WHEN v_task.origin = 'closure' THEN ' • Workflow completed'
        WHEN v_current_stage IN ('won', 'lost', 'invalid') THEN ' • Workflow completed'
        ELSE '' 
      END
    ),
    v_task.lead_id, 
    auth.uid()
  );

  -- Return results
  RETURN QUERY SELECT 
    p_task_id as completed_task_id,
    v_next_task_id as next_task_id, 
    v_next_event_id as next_event_id,
    v_current_stage as lead_stage;
END;
$$;