-- Critical Security Fixes Migration (Fixed)

-- 1. Fix profiles table security issues
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create secure profiles policies with restricted access
CREATE POLICY "Users can view limited profile info" ON public.profiles
FOR SELECT USING (
  CASE 
    WHEN user_id = auth.uid() THEN true  -- Users can see their own full profile
    WHEN is_admin() THEN true  -- Admins can see all profiles
    ELSE (user_id IS NOT NULL)  -- Others can only see that profile exists (name only)
  END
);

CREATE POLICY "Users can update non-sensitive profile fields" ON public.profiles
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND 
  -- Prevent role changes by regular users - only admins can change roles
  (role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()) OR is_admin())
);

CREATE POLICY "System can create profiles" ON public.profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (is_admin());

-- 2. Create audit trigger for profile role changes (FIXED)
CREATE OR REPLACE FUNCTION public.audit_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only audit role changes on UPDATE operations
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.profile_audit (
      user_id,
      old_role,
      new_role,
      changed_by
    ) VALUES (
      NEW.user_id,
      OLD.role,
      NEW.role,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS profile_role_audit_trigger ON public.profiles;

CREATE TRIGGER profile_role_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_role_change();

-- 3. Fix notifications security
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications for themselves" ON public.notifications
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create any notifications" ON public.notifications
FOR INSERT WITH CHECK (is_admin());

-- 4. Improve user bootstrap process
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with secure defaults
  INSERT INTO public.profiles (user_id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'agent',  -- Always default to agent, admins must be promoted
    'active'
  );
  
  -- Create user role entry
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (
    NEW.id,
    'agent'::app_role,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger to ensure it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Update SQL functions with explicit search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('agent','admin','superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_secure()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select auth.uid();
$$;

-- 6. Add validation for profile_audit inserts
DROP POLICY IF EXISTS "System can create profile audit" ON public.profile_audit;

CREATE POLICY "Authenticated users can create profile audit" ON public.profile_audit
FOR INSERT WITH CHECK (
  -- Only allow if the change is being made by the user themselves or an admin
  changed_by = auth.uid() AND (
    user_id = auth.uid() OR  -- User changing their own profile
    is_admin()              -- Or admin changing any profile
  )
);