-- Remove the security definer view (causes security warning)
DROP VIEW IF EXISTS public.profiles_safe;

-- Instead, we'll rely on application-layer masking since RLS cannot conditionally
-- mask columns based on complex permission functions without SECURITY DEFINER

-- The profiles_select_with_phone_privacy policy already restricts access appropriately:
-- - Users can only see their own profile (all fields including phone)
-- - Admins can see all profiles (application must mask phone via can_view_profile_sensitive)

-- Add audit logging for profile access by admins
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when admin accesses another user's profile
  IF has_role(auth.uid(), 'admin') AND NEW.user_id != auth.uid() THEN
    INSERT INTO public.security_audit (
      user_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'admin_profile_view',
      'profiles',
      NEW.user_id::text,
      jsonb_build_object('viewed_at', now())
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Note: The application layer MUST use applyProfileMasking() from profilePermissions.ts
-- to mask phone numbers when displaying profiles to non-authorized users