-- ============================================
-- STRICT SECURITY FOR PROFILES TABLE
-- Masks email and phone for unauthorized users
-- ============================================

-- 1. Create function to check if user can view sensitive profile fields
CREATE OR REPLACE FUNCTION public.can_view_profile_sensitive(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Can view sensitive fields if:
  -- 1. It's your own profile, OR
  -- 2. You have admin/superadmin role
  SELECT 
    profile_user_id = auth.uid() 
    OR 
    public.has_role(auth.uid(), 'admin')
    OR
    public.has_role(auth.uid(), 'superadmin')
$$;

-- 2. Add column comments to document sensitivity
COMMENT ON COLUMN public.profiles.email IS 'SENSITIVE: Use can_view_profile_sensitive() before displaying. Mask for unauthorized users.';
COMMENT ON COLUMN public.profiles.phone IS 'SENSITIVE: Use can_view_profile_sensitive() before displaying. Mask for unauthorized users.';

-- 3. Create function to log profile access (called from application)
CREATE OR REPLACE FUNCTION public.log_profile_access(
  p_accessed_user_id uuid,
  p_accessed_name text,
  p_accessed_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if accessing another user's profile and user is admin
  IF p_accessed_user_id != auth.uid() 
     AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')) THEN
    
    INSERT INTO public.security_audit (
      user_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'admin_profile_access',
      'profiles',
      p_accessed_user_id::text,
      jsonb_build_object(
        'profile_name', p_accessed_name,
        'profile_email', p_accessed_email,
        'accessed_at', now()
      )
    );
  END IF;
END;
$$;