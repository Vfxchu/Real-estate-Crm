-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.map_status_to_contact_status(lead_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.leads_sync_contact_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status) then
    NEW.contact_status := public.map_status_to_contact_status(NEW.status);
  end if;
  return NEW;
end;
$$;