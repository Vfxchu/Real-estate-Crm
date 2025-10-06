-- Update the create_auto_followup trigger to create an initial "Contact the lead" task
-- Drop triggers and function with CASCADE to handle dependencies

DROP TRIGGER IF EXISTS auto_followup_trigger ON leads CASCADE;
DROP TRIGGER IF EXISTS tg_leads_auto_followup ON leads CASCADE;
DROP FUNCTION IF EXISTS public.create_auto_followup() CASCADE;

CREATE OR REPLACE FUNCTION public.create_auto_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_event_id UUID;
  v_due_at TIMESTAMPTZ;
  v_existing_task_count INT;
BEGIN
  -- Check if an open "Contact" task already exists for this lead (idempotency)
  SELECT COUNT(*) INTO v_existing_task_count
  FROM calendar_events
  WHERE lead_id = NEW.id
    AND status = 'scheduled'
    AND (title ILIKE '%contact%' OR event_type = 'task' OR event_type = 'follow_up');
  
  -- Only create if no existing open task
  IF v_existing_task_count = 0 THEN
    v_due_at := NEW.created_at; -- Immediate
    
    -- Create initial contact task
    INSERT INTO tasks (
      title, due_at, type, origin, lead_id, assigned_to, sync_origin, created_by
    ) VALUES (
      'Contact the lead', v_due_at, 'task', 'auto_contact',
      NEW.id, NEW.agent_id, 'task', NEW.agent_id
    ) RETURNING id INTO v_task_id;

    -- Create linked calendar event
    INSERT INTO calendar_events (
      title, start_date, end_date, event_type, lead_id, agent_id,
      task_id, reminder_offset_min, created_by, status
    ) VALUES (
      'Contact the lead', v_due_at, v_due_at + interval '1 hour', 'task',
      NEW.id, NEW.agent_id, v_task_id, 0, NEW.agent_id, 'scheduled'
    ) RETURNING id INTO v_event_id;

    -- Link them
    UPDATE tasks SET calendar_event_id = v_event_id WHERE id = v_task_id;

    -- Log activity
    INSERT INTO activities (type, description, lead_id, created_by)
    VALUES ('task_created', 'Auto-created initial contact task', NEW.id, NEW.agent_id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If task creation fails, lead creation should still succeed (soft fail)
  RAISE WARNING 'Failed to create auto contact task: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER tg_leads_auto_followup
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_followup();