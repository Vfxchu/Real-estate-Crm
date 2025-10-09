-- CRITICAL SECURITY FIX: Implement proper role-based access control (Final version)

-- Step 1: Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'user', 'superadmin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 5: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT user_id, role::app_role, created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Update ALL RLS policies to use has_role()

-- Automation executions policy (THIS MUST BE UPDATED FIRST)
DROP POLICY IF EXISTS "automation_executions unified view" ON public.automation_executions;
CREATE POLICY "automation_executions unified view" ON public.automation_executions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM automation_workflows w
    WHERE w.id = automation_executions.workflow_id 
      AND (w.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  )
);

-- Leads policies
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads" ON public.leads
FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Leads unified update policy" ON public.leads;
CREATE POLICY "Leads unified update policy" ON public.leads
FOR UPDATE USING (
  (agent_id = auth.uid()) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

-- Properties policies
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;
CREATE POLICY "Admins can delete properties" ON public.properties
FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Activities policies
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;
CREATE POLICY "Users can delete own activities" ON public.activities
FOR DELETE USING (
  (created_by = auth.uid()) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Users can view related activities" ON public.activities;
CREATE POLICY "Users can view related activities" ON public.activities
FOR SELECT USING (
  (created_by = auth.uid()) OR 
  (lead_id IN (SELECT l.id FROM leads l WHERE l.agent_id = auth.uid())) OR 
  (property_id IN (SELECT p.id FROM properties p WHERE p.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

-- Deals policies
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
CREATE POLICY "Admins can delete deals" ON public.deals
FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Contact files policies
DROP POLICY IF EXISTS "Agents can delete related contact files" ON public.contact_files;
CREATE POLICY "Agents can delete related contact files" ON public.contact_files
FOR DELETE USING (
  (contact_id IN (SELECT l.id FROM leads l WHERE l.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Agents can update related contact files" ON public.contact_files;
CREATE POLICY "Agents can update related contact files" ON public.contact_files
FOR UPDATE USING (
  (contact_id IN (SELECT l.id FROM leads l WHERE l.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Agents can view related contact files" ON public.contact_files;
CREATE POLICY "Agents can view related contact files" ON public.contact_files
FOR SELECT USING (
  (contact_id IN (SELECT l.id FROM leads l WHERE l.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

-- Contact properties policies
DROP POLICY IF EXISTS "contact_properties delete" ON public.contact_properties;
CREATE POLICY "contact_properties delete" ON public.contact_properties
FOR DELETE USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin') OR
  (EXISTS (SELECT 1 FROM leads l WHERE l.id = contact_id AND l.agent_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.agent_id = auth.uid()))
);

DROP POLICY IF EXISTS "contact_properties insert" ON public.contact_properties;
CREATE POLICY "contact_properties insert" ON public.contact_properties
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin') OR
  ((contact_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM leads l WHERE l.id = contact_id AND l.agent_id = auth.uid()))) OR
  ((property_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.agent_id = auth.uid())))
);

DROP POLICY IF EXISTS "contact_properties select" ON public.contact_properties;
CREATE POLICY "contact_properties select" ON public.contact_properties
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin') OR
  (EXISTS (SELECT 1 FROM leads l WHERE l.id = contact_id AND l.agent_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.agent_id = auth.uid()))
);

DROP POLICY IF EXISTS "contact_properties update" ON public.contact_properties;
CREATE POLICY "contact_properties update" ON public.contact_properties
FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin') OR
  (EXISTS (SELECT 1 FROM leads l WHERE l.id = contact_id AND l.agent_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.agent_id = auth.uid()))
);

-- Notifications policies
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
FOR DELETE USING (
  (user_id = auth.uid()) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (
  (user_id = auth.uid()) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (
  (user_id = auth.uid()) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

-- Profile audit policies
DROP POLICY IF EXISTS "Admins can create profile audit" ON public.profile_audit;
CREATE POLICY "Admins can create profile audit" ON public.profile_audit
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can view profile audit" ON public.profile_audit;
CREATE POLICY "Admins can view profile audit" ON public.profile_audit
FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_unified" ON public.profiles;
CREATE POLICY "profiles_select_unified" ON public.profiles
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin') OR
  (auth.uid() = user_id)
);

-- Property files policies
DROP POLICY IF EXISTS "Agents can delete related property files" ON public.property_files;
CREATE POLICY "Agents can delete related property files" ON public.property_files
FOR DELETE USING (
  (property_id IN (SELECT p.id FROM properties p WHERE p.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Agents can update related property files" ON public.property_files;
CREATE POLICY "Agents can update related property files" ON public.property_files
FOR UPDATE USING (
  (property_id IN (SELECT p.id FROM properties p WHERE p.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Agents can view related property files" ON public.property_files;
CREATE POLICY "Agents can view related property files" ON public.property_files
FOR SELECT USING (
  (property_id IN (SELECT p.id FROM properties p WHERE p.agent_id = auth.uid())) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

-- Security audit policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit;
CREATE POLICY "Admins can view audit logs" ON public.security_audit
FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Step 7: Add RLS to transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view own transactions" ON public.transactions;
CREATE POLICY "Agents can view own transactions" ON public.transactions
FOR SELECT USING (
  agent_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Agents can create transactions" ON public.transactions;
CREATE POLICY "Agents can create transactions" ON public.transactions
FOR INSERT WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can update own transactions" ON public.transactions;
CREATE POLICY "Agents can update own transactions" ON public.transactions
FOR UPDATE USING (
  agent_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;
CREATE POLICY "Admins can delete transactions" ON public.transactions
FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Step 8: Update get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() ORDER BY 
      CASE role
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'agent' THEN 3
        WHEN 'user' THEN 4
      END
    LIMIT 1),
    'agent'
  );
$$;

-- Step 9: Remove role column from profiles (now safe after updating all dependent policies)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;