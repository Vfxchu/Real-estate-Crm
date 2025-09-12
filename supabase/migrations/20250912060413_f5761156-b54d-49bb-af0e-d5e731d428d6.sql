-- Apply remaining security fixes (skip already applied policies)

-- Fix Transaction RLS Policies with proper agent validation
DROP POLICY IF EXISTS "Agents can create transactions with mandatory assignment" ON public.transactions;
DROP POLICY IF EXISTS "Agents can view their assigned transactions only" ON public.transactions;
DROP POLICY IF EXISTS "Agents can update their assigned transactions only" ON public.transactions;
DROP POLICY IF EXISTS "Agents can delete their assigned transactions only" ON public.transactions;

CREATE POLICY "Agents can create transactions with mandatory assignment" 
ON public.transactions 
FOR INSERT 
WITH CHECK (
  agent_id IS NOT NULL AND 
  agent_id = auth.uid() AND
  lead_id IS NOT NULL
);

CREATE POLICY "Agents can view their assigned transactions only" 
ON public.transactions 
FOR SELECT 
USING (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
);

CREATE POLICY "Agents can update their assigned transactions only" 
ON public.transactions 
FOR UPDATE 
USING (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
)
WITH CHECK (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
);

CREATE POLICY "Agents can delete their assigned transactions only" 
ON public.transactions 
FOR DELETE 
USING (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
);

-- Strengthen Profile Security - prevent self-role modification
CREATE OR REPLACE FUNCTION public.validate_profile_role_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from changing their own role unless they are admin
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only admins can change roles
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Access denied: Only administrators can modify user roles';
    END IF;
    
    -- Prevent admins from removing their own admin role (prevent lockout)
    IF OLD.user_id = auth.uid() AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
      RAISE EXCEPTION 'Access denied: Cannot remove your own admin privileges';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the security trigger
DROP TRIGGER IF EXISTS validate_profile_role_security_trigger ON public.profiles;
CREATE TRIGGER validate_profile_role_security_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_role_security();

-- Enhanced Role Change Auditing
CREATE OR REPLACE FUNCTION public.enhanced_audit_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Audit all profile changes, not just role changes
  IF TG_OP = 'UPDATE' THEN
    -- Log role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
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
    
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.profile_audit (
        user_id,
        old_role,
        new_role,
        changed_by
      ) VALUES (
        NEW.user_id,
        CONCAT('status:', OLD.status),
        CONCAT('status:', NEW.status),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the audit trigger
DROP TRIGGER IF EXISTS audit_profile_role_change_trigger ON public.profiles;
DROP TRIGGER IF EXISTS enhanced_audit_profile_role_change_trigger ON public.profiles;
CREATE TRIGGER enhanced_audit_profile_role_change_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_audit_profile_role_change();