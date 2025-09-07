-- SECURITY FIXES - Step 5: Complete remaining fixes

-- Fix properties RLS - remove the overly permissive policy and create secure one
DROP POLICY IF EXISTS "properties_select_policy" ON public.properties;

CREATE POLICY "properties_select_secure" 
ON public.properties 
FOR SELECT 
USING (
    -- Agents can see their own properties, admins can see all
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

-- Enable RLS on leads_per_agent_per_month and add policy
ALTER TABLE public.leads_per_agent_per_month ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_per_agent_stats_select" 
ON public.leads_per_agent_per_month 
FOR SELECT 
USING (
    -- Agents can see their own stats, admins can see all
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

-- Attach missing security triggers that were created but not attached

-- Profile role protection trigger
DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Lead input sanitization trigger
DROP TRIGGER IF EXISTS sanitize_lead_input_trigger ON public.leads;
CREATE TRIGGER sanitize_lead_input_trigger
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_lead_input();

-- File validation triggers
DROP TRIGGER IF EXISTS validate_file_upload_trigger ON public.property_files;
CREATE TRIGGER validate_file_upload_trigger
    BEFORE INSERT OR UPDATE ON public.property_files
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_file_upload();

DROP TRIGGER IF EXISTS validate_contact_file_upload_trigger ON public.contact_files;
CREATE TRIGGER validate_contact_file_upload_trigger
    BEFORE INSERT OR UPDATE ON public.contact_files
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_file_upload();

-- Role assignment validation trigger
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER validate_role_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_assignment();

-- Profile audit trigger
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_role_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_role_changes();

-- Clean up the duplicate create_property_with_files function (the simple one)
DROP FUNCTION IF EXISTS public.create_property_with_files(text, text, text[], uuid);