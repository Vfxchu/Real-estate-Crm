-- Fix RLS on profiles to allow admins full access
BEGIN;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
ON public.profiles
FOR SELECT
USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy
ON public.profiles
FOR UPDATE
USING (public.is_admin() OR user_id = auth.uid())
WITH CHECK (public.is_admin() OR user_id = auth.uid());

COMMIT;