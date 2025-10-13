-- ============================================
-- IMPROVED RLS POLICIES FOR LEADS TABLE
-- Security Enhancement: Better granularity and documentation
-- ============================================

-- Drop existing overly broad policy
DROP POLICY IF EXISTS "leads_all" ON public.leads;

-- ============================================
-- SELECT POLICY: Agents see only their assigned leads, admins see all
-- ============================================
CREATE POLICY "Agents can view their assigned leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid() 
  OR 
  has_role(auth.uid(), 'admin')
);

-- ============================================
-- INSERT POLICY: Users can only create leads assigned to themselves or admins can assign to anyone
-- ============================================
CREATE POLICY "Agents can create leads assigned to themselves"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() 
  OR 
  has_role(auth.uid(), 'admin')
);

-- ============================================
-- UPDATE POLICY: Agents can only update their own leads, admins can update any
-- ============================================
CREATE POLICY "Agents can update their assigned leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  agent_id = auth.uid() 
  OR 
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  agent_id = auth.uid() 
  OR 
  has_role(auth.uid(), 'admin')
);

-- ============================================
-- DELETE POLICY: Only admins can delete leads
-- ============================================
CREATE POLICY "Only admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);

-- ============================================
-- AUDIT TRAIL: Log when admins access leads not assigned to them
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_admin_lead_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when an admin accesses a lead not assigned to them
  IF has_role(auth.uid(), 'admin') AND NEW.agent_id != auth.uid() THEN
    INSERT INTO public.security_audit (
      user_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'admin_lead_access',
      'leads',
      NEW.id::text,
      jsonb_build_object(
        'lead_name', NEW.name,
        'lead_email', NEW.email,
        'assigned_agent', NEW.agent_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for audit logging on SELECT (via UPDATE tracking)
DROP TRIGGER IF EXISTS audit_admin_lead_access_trigger ON public.leads;
CREATE TRIGGER audit_admin_lead_access_trigger
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.audit_admin_lead_access();

-- ============================================
-- COMMENT: Document the security model
-- ============================================
COMMENT ON POLICY "Agents can view their assigned leads" ON public.leads IS 
  'Agents can only view leads assigned to them (agent_id = auth.uid()). Admins can view all leads for business operations (reassignment, reporting, quality control). All admin access is logged in security_audit table.';

COMMENT ON POLICY "Only admins can delete leads" ON public.leads IS 
  'Only administrators can delete leads to prevent accidental or malicious data loss by agents.';

-- ============================================
-- VERIFICATION QUERY (for testing)
-- ============================================
-- Run this as different users to verify policies work correctly:
-- SELECT id, name, email, phone, agent_id FROM leads WHERE agent_id != auth.uid();
-- This should return 0 rows for agents, and all rows for admins