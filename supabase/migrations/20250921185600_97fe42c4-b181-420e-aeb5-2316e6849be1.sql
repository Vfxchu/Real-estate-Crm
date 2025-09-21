-- Add reminder functionality to calendar_events
ALTER TABLE calendar_events 
  ADD COLUMN IF NOT EXISTS reminder_offset_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz,
  ADD COLUMN IF NOT EXISTS next_due_at timestamptz;

-- Function to set next_due_at based on snooze_until or start_date - reminder_offset
CREATE OR REPLACE FUNCTION set_calendar_event_due()
RETURNS trigger AS $$
BEGIN
  -- next_due_at = snooze_until (if set) else start_date - reminder_offset_min minutes
  NEW.next_due_at :=
    COALESCE(
      NEW.snooze_until,
      NEW.start_date - (NEW.reminder_offset_min || ' minutes')::interval
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain next_due_at
DROP TRIGGER IF EXISTS set_calendar_event_due_trigger ON calendar_events;
CREATE TRIGGER set_calendar_event_due_trigger
  BEFORE INSERT OR UPDATE OF start_date, reminder_offset_min, snooze_until
  ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_calendar_event_due();

-- Update existing events to set next_due_at
UPDATE calendar_events 
SET next_due_at = start_date - (reminder_offset_min || ' minutes')::interval
WHERE next_due_at IS NULL;