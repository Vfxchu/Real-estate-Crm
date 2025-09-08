-- Complete fix for infinite recursion - Use profiles table for role checking entirely
-- to avoid ANY reference to user_roles table in RLS policies

-- Update the get_user_role_secure function to only use profiles table
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Only use profiles table to avoid recursion
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE user_id = user_uuid
    LIMIT 1;
    
    -- Default to agent if no role found
    RETURN COALESCE(user_role, 'agent');
END;
$$;

-- Now fix all RLS policies to use this simplified function
-- USER_ROLES table policies - completely avoid self-reference
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin_only ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_admin_only ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_admin_only ON public.user_roles;

-- Use profiles table role check for user_roles policies
CREATE POLICY user_roles_select_own_or_admin
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY user_roles_insert_admin_only
ON public.user_roles
FOR INSERT
WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY user_roles_update_admin_only
ON public.user_roles
FOR UPDATE
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY user_roles_delete_admin_only
ON public.user_roles
FOR DELETE
USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');

-- Update all other policies to use the safe function
-- LEADS
DROP POLICY IF EXISTS leads_select_policy ON public.leads;
CREATE POLICY leads_select_policy
ON public.leads
FOR SELECT
USING (
  agent_id = auth.uid() OR public.get_user_role_secure(auth.uid()) = 'admin'
);

-- CALENDAR_EVENTS
DROP POLICY IF EXISTS calendar_events_select_own_or_admin ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_insert_own_or_admin ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_update_own_or_admin ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_delete_own_or_admin ON public.calendar_events;

CREATE POLICY calendar_events_select_own_or_admin
ON public.calendar_events
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY calendar_events_insert_own_or_admin
ON public.calendar_events
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  OR public.get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY calendar_events_update_own_or_admin
ON public.calendar_events
FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.get_user_role_secure(auth.uid()) = 'admin'
)
WITH CHECK (
  created_by = auth.uid()
  OR public.get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY calendar_events_delete_own_or_admin
ON public.calendar_events
FOR DELETE
USING (
  created_by = auth.uid()
  OR public.get_user_role_secure(auth.uid()) = 'admin'
);

-- PROPERTIES
DROP POLICY IF EXISTS properties_delete_admin_only ON public.properties;
CREATE POLICY properties_delete_admin_only
ON public.properties
FOR DELETE
USING (public.get_user_role_secure(auth.uid()) = 'admin');