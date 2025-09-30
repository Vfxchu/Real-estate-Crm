-- Update ensure_manual_followup to prevent task creation for terminal statuses
CREATE OR REPLACE FUNCTION public.ensure_manual_followup(
  p_lead_id uuid,
  p_due_at timestamp with time zone DEFAULT ((now() AT TIME ZONE 'utc'::text) + '01:00:00'::interval),
  p_title text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task_id UUID;
  v_event_id UUID;
  v_lead_agent UUID;
  v_lead_name TEXT;
  v_lead_status TEXT;
  v_final_title TEXT;
BEGIN
  -- Get lead info including status
  SELECT agent_id, name, status INTO v_lead_agent, v_lead_name, v_lead_status
  FROM leads WHERE id = p_lead_id;
  
  IF v_lead_agent IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  -- CRITICAL: Block task creation for terminal statuses
  IF v_lead_status IN ('won', 'lost') THEN
    RAISE EXCEPTION 'Cannot create follow-up task: Lead status is % (workflow ended)', v_lead_status;
  END IF;

  -- Check for invalid status in custom_fields
  IF (SELECT (custom_fields->>'invalid')::boolean FROM leads WHERE id = p_lead_id) = true THEN
    RAISE EXCEPTION 'Cannot create follow-up task: Lead is marked as Invalid (workflow ended)';
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
$function$;

-- Update apply_followup_outcome to check current status before allowing outcome
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
AS $function$
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
  v_is_invalid BOOLEAN;
BEGIN
  -- Detect stage column (prefer 'stage', fallback to 'status')
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'stage') 
    THEN 'stage'
    ELSE 'status'
  END INTO v_stage_column;
  
  -- Get current lead info
  EXECUTE format('SELECT %I, agent_id, name, (custom_fields->>''invalid'')::boolean FROM leads WHERE id = $1', v_stage_column)
    USING p_lead_id INTO v_current_stage, v_lead_agent, v_lead_name, v_is_invalid;
    
  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  -- CRITICAL: Prevent outcome recording for terminal statuses (except from Status tab)
  IF v_current_stage IN ('won', 'lost') THEN
    RAISE EXCEPTION 'Cannot record outcome: Lead is already % (workflow ended). Change status from Status tab if needed.', v_current_stage;
  END IF;

  IF v_is_invalid = true THEN
    RAISE EXCEPTION 'Cannot record outcome: Lead is marked Invalid (workflow ended). Change status from Status tab if needed.';
  END IF;

  -- Require reasons for Invalid and Deal Lost
  IF p_outcome IN ('Invalid', 'Deal Lost') AND p_reason_id IS NULL THEN
    RAISE EXCEPTION 'Reason required for outcome: %', p_outcome;
  END IF;

  -- Apply stage transitions
  v_new_stage := CASE p_outcome
    WHEN 'Interested' THEN 'qualified'
    WHEN 'Meeting Scheduled' THEN 'qualified'
    WHEN 'Under Offer' THEN 'negotiating'
    WHEN 'Deal Won' THEN 'won'
    WHEN 'Deal Lost' THEN 
      CASE WHEN COALESCE(p_client_still_with_us, false) THEN 'new' ELSE 'lost' END
    WHEN 'Invalid' THEN 'new'  -- Set to 'new' but mark as invalid in custom_fields
    WHEN 'Call Back Request' THEN 'contacted'
    WHEN 'No Answer' THEN 'contacted'
    ELSE v_current_stage
  END;

  -- Update lead stage and handle Invalid marking
  IF p_outcome = 'Invalid' THEN
    EXECUTE format('UPDATE leads SET %I = $1, custom_fields = jsonb_set(COALESCE(custom_fields, ''{}''::jsonb), ''{invalid}'', ''true'', true), updated_at = now() WHERE id = $2', v_stage_column)
      USING v_new_stage, p_lead_id;
  ELSE
    EXECUTE format('UPDATE leads SET %I = $1, updated_at = now() WHERE id = $2', v_stage_column)
      USING v_new_stage, p_lead_id;
  END IF;

  -- Determine if we should create a task (STOP for terminal outcomes)
  v_should_create_task := CASE p_outcome
    WHEN 'Deal Won' THEN false  -- No task for Deal Won
    WHEN 'Invalid' THEN false   -- No task for Invalid (workflow stopped)
    WHEN 'Deal Lost' THEN 
      -- Only create closure task if not restarting workflow
      NOT COALESCE(p_client_still_with_us, false)
    ELSE true  -- Create regular follow-up task for other outcomes
  END;

  -- Create task only if needed
  IF v_should_create_task THEN
    -- Set task title
    v_task_title := COALESCE(p_title, 
      CASE p_outcome
        WHEN 'Deal Lost' THEN 'Close-out follow-up'
        ELSE 'Follow up with ' || v_lead_name
      END
    );

    -- Create follow-up or closure task
    INSERT INTO tasks (
      title, due_at, type, origin, lead_id, assigned_to, sync_origin, created_by
    ) VALUES (
      v_task_title, p_due_at, 'follow_up', 
      CASE WHEN p_outcome = 'Deal Lost' THEN 'closure' ELSE 'manual_followup' END,
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
    format('Follow-up outcome: %s → %s%s%s', 
      p_outcome, v_new_stage,
      CASE WHEN p_notes IS NOT NULL THEN ' • ' || p_notes ELSE '' END,
      CASE WHEN NOT v_should_create_task THEN ' • Workflow completed' ELSE '' END
    ), 
    p_lead_id, auth.uid()
  );

  RETURN QUERY SELECT v_new_stage, v_task_id, v_event_id;
END;
$function$;