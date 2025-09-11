-- Fix security issues identified in the review

-- 1. Fix contact_files and property_files RLS policies to be ownership-based
DROP POLICY IF EXISTS "Users can create contact files" ON contact_files;
DROP POLICY IF EXISTS "Users can view contact files" ON contact_files;
DROP POLICY IF EXISTS "Users can update contact files" ON contact_files;
DROP POLICY IF EXISTS "Users can delete contact files" ON contact_files;

DROP POLICY IF EXISTS "Users can create property files" ON property_files;
DROP POLICY IF EXISTS "Users can view property files" ON property_files;
DROP POLICY IF EXISTS "Users can update property files" ON property_files;
DROP POLICY IF EXISTS "Users can delete property files" ON property_files;

-- Create secure contact_files policies based on lead ownership
CREATE POLICY "Agents can create contact files for their leads"
ON contact_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = contact_files.contact_id 
    AND l.agent_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Agents can view contact files for their leads"
ON contact_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = contact_files.contact_id 
    AND l.agent_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Agents can update contact files for their leads"
ON contact_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = contact_files.contact_id 
    AND l.agent_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Agents can delete contact files for their leads"
ON contact_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = contact_files.contact_id 
    AND l.agent_id = auth.uid()
  ) OR is_admin()
);

-- Create secure property_files policies based on property ownership
CREATE POLICY "Agents can create property files for their properties"
ON property_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_files.property_id 
    AND p.agent_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Agents can view property files for their properties"
ON property_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_files.property_id 
    AND p.agent_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Agents can update property files for their properties"
ON property_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_files.property_id 
    AND p.agent_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Agents can delete property files for their properties"
ON property_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_files.property_id 
    AND p.agent_id = auth.uid()
  ) OR is_admin()
);

-- 2. Remove the insecure fallback from get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. Tighten profiles policies - remove system insert policy and make role updates admin-only
DROP POLICY IF EXISTS "System can create profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile except role" ON profiles;

-- Only allow profile creation through the trigger
CREATE POLICY "Profiles created by trigger only"
ON profiles FOR INSERT
WITH CHECK (false); -- Explicitly deny direct inserts

-- Users can update their own profile but not the role field
CREATE POLICY "Users can update own profile data"
ON profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND OLD.role = NEW.role);

-- Admins can update roles
CREATE POLICY "Admins can update profile roles"
ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- 4. Fix leads insert policy to enforce agent assignment
DROP POLICY IF EXISTS "Users can create leads" ON leads;

CREATE POLICY "Agents can create leads assigned to themselves"
ON leads FOR INSERT
WITH CHECK (agent_id = auth.uid() OR is_admin());

-- 5. Update user creation trigger to be more secure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with secure defaults
  INSERT INTO public.profiles (user_id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'agent',  -- Always default to agent
    'active'
  );
  
  -- Create user role entry (this is the authoritative source)
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (
    NEW.id,
    'agent'::app_role,
    NEW.id  -- Self-assigned initially
  ) ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;