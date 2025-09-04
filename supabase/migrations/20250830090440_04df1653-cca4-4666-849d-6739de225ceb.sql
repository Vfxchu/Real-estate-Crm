-- Security fixes migration

-- 1. Add missing trigger to protect profile role changes
DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 2. Update handle_new_user function to always default to 'agent' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'agent'  -- Always default to agent, no metadata role
  );

  RETURN NEW;
END;
$$;

-- 3. Update inconsistent RLS policies to use secure function
-- Update leads policies
DROP POLICY IF EXISTS "leads_select_policy" ON public.leads;
CREATE POLICY "leads_select_policy" 
ON public.leads 
FOR SELECT 
USING (
  (public.get_user_role_secure(auth.uid()) = 'admin') OR 
  (agent_id = auth.uid())
);

-- Update properties policies  
DROP POLICY IF EXISTS "agents_can_view_all_properties" ON public.properties;
DROP POLICY IF EXISTS "properties_admin_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_delete_policy" ON public.properties;

CREATE POLICY "properties_select_policy" 
ON public.properties 
FOR SELECT 
USING (
  (public.get_user_role_secure(auth.uid()) = 'admin') OR 
  (public.get_user_role_secure(auth.uid()) = 'agent')
);

CREATE POLICY "properties_delete_admin_only" 
ON public.properties 
FOR DELETE 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- 4. Update user_roles policies for consistency
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin_only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin_only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin_only" ON public.user_roles;

CREATE POLICY "user_roles_select_own_or_admin" 
ON public.user_roles 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  (public.get_user_role_secure(auth.uid()) = 'admin')
);

CREATE POLICY "user_roles_insert_admin_only" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "user_roles_update_admin_only" 
ON public.user_roles 
FOR UPDATE 
USING (public.get_user_role_secure(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "user_roles_delete_admin_only" 
ON public.user_roles 
FOR DELETE 
USING (public.get_user_role_secure(auth.uid()) = 'admin');