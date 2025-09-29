-- Create function to complete task and auto-create next follow-up
CREATE OR REPLACE FUNCTION public.complete_task_with_auto_followup(
  p_task_id uuid,
  p_auto_next_hours integer DEFAULT 1
) RETURNS TABLE(
  completed_task_id uuid,
  next_task_id uuid,
  next_event_id uuid,
  lead_stage text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Determine if we should create next follow-up based on stage
  v_should_create_next := CASE v_current_stage
    WHEN 'new' THEN true
    WHEN 'contacted' THEN true  
    WHEN 'qualified' THEN true
    WHEN 'under offer' THEN true
    WHEN 'negotiating' THEN true  -- alternate name for under offer
    WHEN 'won' THEN false
    WHEN 'lost' THEN false
    WHEN 'invalid' THEN false
    ELSE true  -- default to true for unknown stages
  END;

  -- Create next follow-up task if appropriate
  IF v_should_create_next AND v_task.lead_id IS NOT NULL THEN
    v_next_due_at := now() + make_interval(hours => p_auto_next_hours);
    v_next_title := 'Follow up with ' || COALESCE(v_task.lead_name, 'lead');

    -- Check for existing open auto follow-up tasks to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE lead_id = v_task.lead_id 
        AND status IN ('Open', 'ToDo') 
        AND origin = 'auto_followup'
    ) THEN
      -- Create next follow-up task
      INSERT INTO tasks (
        title, due_at, type, origin, lead_id, assigned_to, 
        sync_origin, created_by
      ) VALUES (
        v_next_title, v_next_due_at, 'follow_up', 'auto_followup',
        v_task.lead_id, COALESCE(v_task.lead_agent_id, v_task.assigned_to), 
        'task', auth.uid()
      ) RETURNING id INTO v_next_task_id;

      -- Create linked calendar event
      INSERT INTO calendar_events (
        title, start_date, end_date, event_type, lead_id, agent_id,
        task_id, reminder_offset_min, created_by
      ) VALUES (
        v_next_title, v_next_due_at, v_next_due_at + interval '1 hour', 'follow_up',
        v_task.lead_id, COALESCE(v_task.lead_agent_id, v_task.assigned_to),
        v_next_task_id, 0, auth.uid()
      ) RETURNING id INTO v_next_event_id;

      -- Link calendar event to task
      UPDATE tasks SET calendar_event_id = v_next_event_id WHERE id = v_next_task_id;
    END IF;
  END IF;

  -- Log completion activity
  INSERT INTO activities (type, description, lead_id, created_by)
  VALUES (
    'task_completed', 
    format('Task completed: "%s"%s', 
      v_task.title,
      CASE WHEN v_next_task_id IS NOT NULL 
           THEN ' • Next follow-up auto-created' 
           ELSE '' END
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
$function$;