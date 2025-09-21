-- Fix security issue: set search_path for function
CREATE OR REPLACE FUNCTION set_calendar_event_due()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  -- next_due_at = snooze_until (if set) else start_date - reminder_offset_min minutes
  NEW.next_due_at :=
    COALESCE(
      NEW.snooze_until,
      NEW.start_date - (NEW.reminder_offset_min || ' minutes')::interval
    );
  RETURN NEW;
END;
$$;