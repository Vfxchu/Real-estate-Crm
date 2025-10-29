-- Fix leads_status_check constraint to allow 'negotiating' instead of 'under offer'
-- This aligns the constraint with the actual status value used by apply_followup_outcome function

-- Drop the old constraint
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Create the corrected constraint with 'negotiating' instead of 'under offer'
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status = ANY (ARRAY[
    'new'::text, 
    'contacted'::text, 
    'qualified'::text, 
    'negotiating'::text,  -- Changed from 'under offer' to 'negotiating'
    'won'::text, 
    'lost'::text, 
    'invalid'::text
  ]));