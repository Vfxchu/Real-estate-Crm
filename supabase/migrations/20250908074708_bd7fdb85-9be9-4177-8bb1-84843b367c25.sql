-- Fix RLS infinite recursion by removing self-references to user_roles
-- and switching to SECURITY DEFINER role function public.get_user_role_secure

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin_only ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_admin_only ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_admin_only ON public.user_roles;

CREATE POLICY user_roles_select_own_or_admin
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.get_user_role_secure(auth.uid()) = 'admin'
);

CREATE POLICY user_roles_insert_admin_only
ON public.user_roles
FOR INSERT
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY user_roles_update_admin_only
ON public.user_roles
FOR UPDATE
USING (public.get_user_role_secure(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY user_roles_delete_admin_only
ON public.user_roles
FOR DELETE
USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- CALENDAR_EVENTS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
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

-- LEADS (remove subquery to user_roles in select policy)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_select_policy ON public.leads;
CREATE POLICY leads_select_policy
ON public.leads
FOR SELECT
USING (
  agent_id = auth.uid() OR public.get_user_role_secure(auth.uid()) = 'admin'
);

-- PROPERTIES admin delete policy (remove subquery)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS properties_delete_admin_only ON public.properties;
CREATE POLICY properties_delete_admin_only
ON public.properties
FOR DELETE
USING (public.get_user_role_secure(auth.uid()) = 'admin');
