-- CRITICAL SECURITY FIX: Fix overly permissive RLS policies

-- 1. Create security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Fix activities table policies - remove dangerous bypass condition
DROP POLICY IF EXISTS "Users can view activities for their leads" ON public.activities;

CREATE POLICY "Users can view activities for their leads" 
ON public.activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = activities.lead_id 
    AND (
      -- Agents can only see activities for their assigned leads
      (public.get_current_user_role() = 'agent' AND leads.agent_id = auth.uid()) 
      OR 
      -- Admins can see all activities
      public.get_current_user_role() = 'admin'
    )
  )
);

-- 3. Fix leads table policies - remove overly permissive "view all" policy
DROP POLICY IF EXISTS "Agents can view all leads" ON public.leads;

CREATE POLICY "Agents can view assigned leads" 
ON public.leads 
FOR SELECT 
USING (
  -- Agents can only see their assigned leads
  (public.get_current_user_role() = 'agent' AND agent_id = auth.uid())
  OR 
  -- Admins can see all leads
  public.get_current_user_role() = 'admin'
);

-- 4. Fix leads update policy to be more restrictive
DROP POLICY IF EXISTS "Agents can update leads" ON public.leads;

CREATE POLICY "Agents can update assigned leads" 
ON public.leads 
FOR UPDATE 
USING (
  -- Agents can only update their assigned leads
  (public.get_current_user_role() = 'agent' AND agent_id = auth.uid())
  OR 
  -- Admins can update all leads
  public.get_current_user_role() = 'admin'
);

-- 5. Add constraint to prevent role self-escalation
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS prevent_role_escalation;
ALTER TABLE public.profiles ADD CONSTRAINT prevent_role_escalation 
CHECK (
  CASE 
    WHEN role = 'admin' THEN user_id != auth.uid() OR public.get_current_user_role() = 'admin'
    ELSE true 
  END
);

-- 6. Create audit table for profile changes
CREATE TABLE IF NOT EXISTS public.profile_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_role TEXT,
  new_role TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" 
ON public.profile_audit 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- 7. Create trigger for audit logging
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.profile_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profile_role_audit ON public.profiles;
CREATE TRIGGER profile_role_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();