-- ============================================
-- COLLABORATIVE SECURITY FOR PROFILES TABLE
-- Allows team visibility while protecting phone numbers
-- ============================================

-- 1. Update function to check sensitive field access (now only for phone)
CREATE OR REPLACE FUNCTION public.can_view_profile_sensitive(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Can view sensitive fields (phone) if:
  -- 1. It's your own profile, OR
  -- 2. You have admin/superadmin role
  SELECT 
    profile_user_id = auth.uid() 
    OR 
    public.has_role(auth.uid(), 'admin')
    OR
    public.has_role(auth.uid(), 'superadmin')
$$;

-- 2. Update column comments to reflect collaborative security
COMMENT ON COLUMN public.profiles.email IS 'TEAM VISIBLE: All authenticated users can view for collaboration.';
COMMENT ON COLUMN public.profiles.phone IS 'SENSITIVE: Use can_view_profile_sensitive() before displaying. Mask for unauthorized users.';

-- 3. Update the log function description
COMMENT ON FUNCTION public.log_profile_access IS 'Logs when admins access phone numbers of other users for audit compliance';

-- 4. Log the security policy change
INSERT INTO public.security_audit (
  user_id,
  action,
  resource_type,
  resource_id,
  new_values
)
SELECT
  auth.uid(),
  'security_policy_update',
  'profiles',
  'collaborative_security_implementation',
  jsonb_build_object(
    'change', 'Updated to collaborative security model',
    'email_visibility', 'All authenticated users (team collaboration)',
    'phone_protection', 'Owner + Admin only',
    'rationale', 'CRM teams need to see colleague contact info for collaboration',
    'timestamp', now()
  )
WHERE auth.uid() IS NOT NULL;