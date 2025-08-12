-- Check if we have the map_status_to_contact_status function
CREATE OR REPLACE FUNCTION public.map_status_to_contact_status(lead_status text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    CASE lead_status
        WHEN 'new' THEN RETURN 'lead';
        WHEN 'contacted', 'qualified', 'negotiating', 'won' THEN RETURN 'contacted';
        WHEN 'lost' THEN RETURN 'lead';
        ELSE RETURN 'lead';
    END CASE;
END;
$$;

-- Create trigger to auto-sync contact status when lead status changes
DROP TRIGGER IF EXISTS leads_status_sync_trigger ON public.leads;
CREATE TRIGGER leads_status_sync_trigger
    BEFORE INSERT OR UPDATE OF status ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.leads_sync_contact_status();