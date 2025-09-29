-- Update activities type constraint to include all workflow activity types
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_type_check 
CHECK (type IN (
  -- Existing types
  'call', 'email', 'meeting', 'note', 'follow_up', 'whatsapp', 'status_change', 'contact_status_change',
  -- New workflow types  
  'task_created', 'task_completed', 'task_rescheduled', 'outcome', 
  'auto_followup', 'manual_followup', 'property_shown', 'offer_made', 'contract_signed'
));