-- SECURITY FIXES - Final Step: Attach missing security triggers only

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