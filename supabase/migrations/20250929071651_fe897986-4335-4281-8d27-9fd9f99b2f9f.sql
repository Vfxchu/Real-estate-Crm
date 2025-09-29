-- Update leads status constraint to match all valid workflow stages
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
CHECK (status IN (
  'new', 'contacted', 'qualified', 'under offer', 'won', 'lost', 'invalid'
));