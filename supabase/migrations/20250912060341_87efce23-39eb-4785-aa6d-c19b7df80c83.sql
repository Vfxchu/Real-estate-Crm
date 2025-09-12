-- CRITICAL SECURITY FIXES

-- 1. Fix Lead RLS Policies - ensure no orphaned leads without agents
DROP POLICY IF EXISTS "Agents can create leads assigned to themselves" ON public.leads;
DROP POLICY IF EXISTS "Agents can view their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can update their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can delete their assigned leads" ON public.leads;

-- Enhanced lead policies with null agent protection
CREATE POLICY "Agents can create leads with mandatory assignment" 
ON public.leads 
FOR INSERT 
WITH CHECK (
  agent_id IS NOT NULL AND 
  agent_id = auth.uid()
);

CREATE POLICY "Agents can view their assigned leads only" 
ON public.leads 
FOR SELECT 
USING (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
);

CREATE POLICY "Agents can update their assigned leads only" 
ON public.leads 
FOR UPDATE 
USING (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
)
WITH CHECK (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
);

CREATE POLICY "Agents can delete their assigned leads only" 
ON public.leads 
FOR DELETE 
USING (
  agent_id IS NOT NULL AND 
  (agent_id = auth.uid() OR is_admin())
);

-- 2. Fix Transaction RLS Policies with proper agent validation
DROP POLICY IF EXISTS "Agents can create transactions for their leads" ON public.transactions;
DROP POLICY IF EXISTS "Agents can view transactions for their leads" ON public.transactions;
DROP POLICY IF EXISTS "Agents can update transactions for their leads" ON public.transactions;
DROP POLICY IF EXISTS "Agents can delete transactions for their leads" ON public.transactions;

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

-- 3. Fix File Access Policies with proper ownership validation
DROP POLICY IF EXISTS "Agents can create contact files for their leads" ON public.contact_files;
DROP POLICY IF EXISTS "Agents can view contact files for their leads" ON public.contact_files;
DROP POLICY IF EXISTS "Agents can update contact files for their leads" ON public.contact_files;
DROP POLICY IF EXISTS "Agents can delete contact files for their leads" ON public.contact_files;

-- Contact files policies with proper ownership verification
CREATE POLICY "Agents can create contact files for owned contacts" 
ON public.contact_files 
FOR INSERT 
WITH CHECK (
  contact_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE id = contact_id 
    AND agent_id = auth.uid()
  )
);

CREATE POLICY "Agents can view contact files for owned contacts" 
ON public.contact_files 
FOR SELECT 
USING (
  contact_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE id = contact_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
);

CREATE POLICY "Agents can update contact files for owned contacts" 
ON public.contact_files 
FOR UPDATE 
USING (
  contact_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE id = contact_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
)
WITH CHECK (
  contact_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE id = contact_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
);

CREATE POLICY "Agents can delete contact files for owned contacts" 
ON public.contact_files 
FOR DELETE 
USING (
  contact_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE id = contact_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
);

-- Property files policies with proper ownership verification
DROP POLICY IF EXISTS "Agents can create property files for their properties" ON public.property_files;
DROP POLICY IF EXISTS "Agents can view property files for their properties" ON public.property_files;
DROP POLICY IF EXISTS "Agents can update property files for their properties" ON public.property_files;
DROP POLICY IF EXISTS "Agents can delete property files for their properties" ON public.property_files;

CREATE POLICY "Agents can create property files for owned properties" 
ON public.property_files 
FOR INSERT 
WITH CHECK (
  property_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_id 
    AND agent_id = auth.uid()
  )
);

CREATE POLICY "Agents can view property files for owned properties" 
ON public.property_files 
FOR SELECT 
USING (
  property_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
);

CREATE POLICY "Agents can update property files for owned properties" 
ON public.property_files 
FOR UPDATE 
USING (
  property_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
)
WITH CHECK (
  property_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
);

CREATE POLICY "Agents can delete property files for owned properties" 
ON public.property_files 
FOR DELETE 
USING (
  property_id IS NOT NULL AND
  (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_id 
    AND agent_id = auth.uid()
  ) OR is_admin())
);

-- 4. Strengthen Profile Security - prevent self-role modification
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

-- 5. Enhanced Role Change Auditing
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
CREATE TRIGGER enhanced_audit_profile_role_change_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_audit_profile_role_change();

-- 6. Add mandatory agent assignment constraint for leads
ALTER TABLE public.leads 
ALTER COLUMN agent_id SET NOT NULL;

-- 7. Add mandatory agent assignment constraint for transactions  
ALTER TABLE public.transactions 
ALTER COLUMN agent_id SET NOT NULL;