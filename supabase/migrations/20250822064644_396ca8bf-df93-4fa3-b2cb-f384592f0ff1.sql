-- Fix 1: Enable RLS on leads_per_agent_per_month and add policies
ALTER TABLE public.leads_per_agent_per_month ENABLE ROW LEVEL SECURITY;

-- Create policies for leads_per_agent_per_month
CREATE POLICY "Admin can view all analytics" 
ON public.leads_per_agent_per_month 
FOR SELECT 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Agent can view own analytics" 
ON public.leads_per_agent_per_month 
FOR SELECT 
USING (agent_id = auth.uid());

-- Deny insert/update/delete from clients
CREATE POLICY "No client modifications" 
ON public.leads_per_agent_per_month 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Fix 2: Add missing validation triggers for leads
DROP TRIGGER IF EXISTS sanitize_lead_input_trigger ON public.leads;
CREATE TRIGGER sanitize_lead_input_trigger
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_lead_input();

DROP TRIGGER IF EXISTS leads_sync_contact_status_trigger ON public.leads;
CREATE TRIGGER leads_sync_contact_status_trigger
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.leads_sync_contact_status();

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Fix 3: Add missing validation triggers for other tables
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Fix 4: Add file validation triggers
DROP TRIGGER IF EXISTS validate_property_file_upload ON public.property_files;
CREATE TRIGGER validate_property_file_upload
    BEFORE INSERT OR UPDATE ON public.property_files
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_file_upload();

DROP TRIGGER IF EXISTS validate_contact_file_upload ON public.contact_files;
CREATE TRIGGER validate_contact_file_upload
    BEFORE INSERT OR UPDATE ON public.contact_files
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_file_upload();

-- Fix 5: Protect profiles.role from unauthorized changes
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow role changes by admins
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF public.get_user_role_secure(auth.uid()) != 'admin' THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to protect profile role changes
DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Fix 6: Add role assignment validation trigger
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER validate_role_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_assignment();

-- Fix 7: Add role change audit trigger
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_role_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_role_changes();