-- Check current constraints and fix them
-- First, let's see what values are currently allowed and add the missing ones

-- Update activities type constraint to include contact_status_change
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_type_check 
CHECK (type IN ('call', 'email', 'meeting', 'note', 'status_change', 'contact_status_change', 'follow_up', 'property_shown', 'offer_made', 'contract_signed'));

-- Update leads contact_status constraint to include both 'lead' and 'contacted'
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_contact_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_contact_status_check 
CHECK (contact_status IN ('lead', 'contacted'));