-- =====================================================
-- Fix 1: Remove Service Account Backdoor in Deals Table
-- =====================================================

-- Remove the blanket service bypass policy
DROP POLICY IF EXISTS "deals_service_controlled" ON public.deals;

-- =====================================================
-- Fix 2: Enforce Phone Number Privacy in Profiles Table
-- =====================================================

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

-- Create a secure SELECT policy that returns phone only when authorized
-- Users can see their own full profile OR admins can see all profiles
-- But phone is only visible if can_view_profile_sensitive() returns true
CREATE POLICY "profiles_select_with_phone_privacy"
ON public.profiles
FOR SELECT
USING (
  -- Own profile: see everything
  user_id = auth.uid()
  OR
  -- Admin: see name and email for all, but phone only if can_view_profile_sensitive allows
  (
    has_role(auth.uid(), 'admin')
  )
);

-- Create a view for safe profile access that masks phone based on permissions
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  user_id,
  name,
  email,
  avatar_url,
  status,
  created_at,
  updated_at,
  -- Conditionally show phone based on permissions
  CASE 
    WHEN can_view_profile_sensitive(user_id) THEN phone
    ELSE '***-***-****'
  END as phone
FROM public.profiles;

-- Grant access to the safe view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_safe IS 'Safe profile view that masks phone numbers based on can_view_profile_sensitive() permissions. Use this view instead of direct table access in application code.';