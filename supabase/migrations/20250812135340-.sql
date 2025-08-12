-- Update activities type constraint to include contact_status_change
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_type_check 
CHECK (type IN ('call', 'email', 'meeting', 'note', 'status_change', 'contact_status_change', 'follow_up', 'property_shown', 'offer_made', 'contract_signed'));

-- Update leads contact_status constraint to include all existing values
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_contact_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_contact_status_check 
CHECK (contact_status IN ('lead', 'contacted', 'active_client', 'past_client'));

-- Update the mapping function to handle the correct contact_status values
CREATE OR REPLACE FUNCTION public.map_status_to_contact_status(lead_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    CASE lead_status
        WHEN 'new' THEN RETURN 'lead';
        WHEN 'contacted', 'qualified', 'negotiating' THEN RETURN 'contacted';
        WHEN 'won' THEN RETURN 'active_client';
        WHEN 'lost' THEN RETURN 'past_client';
        ELSE RETURN 'lead';
    END CASE;
END;
$$;