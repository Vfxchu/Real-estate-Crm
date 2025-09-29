-- Update apply_followup_outcome function to handle terminal outcomes correctly
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

  -- Validate visibility rules for contacted stage only
  IF v_current_stage = 'contacted' AND p_outcome IN ('Under Offer', 'Deal Lost') THEN
    RAISE EXCEPTION 'Outcome % not available in % stage', p_outcome, v_current_stage;
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

    -- Create follow-up task
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