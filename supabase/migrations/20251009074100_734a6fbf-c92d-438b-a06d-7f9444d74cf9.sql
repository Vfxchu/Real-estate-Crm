-- Role-Based Access Control Migration
-- Implements strict visibility rules for admin vs agent roles

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin');
$$;

-- ============================================
-- LEADS: Agents see only their assigned/created leads
-- ============================================
DROP POLICY IF EXISTS "Leads unified update policy" ON leads;
DROP POLICY IF EXISTS "auto_merged_select_authenticated" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON leads;

CREATE POLICY "Leads: Agents view own, Admins view all"
ON leads FOR SELECT
USING (
  is_admin() OR 
  agent_id = auth.uid() OR 
  (SELECT auth.uid()) IN (SELECT user_id FROM user_roles WHERE role = 'agent')
);

CREATE POLICY "Leads: Agents edit own, Admins edit all"
ON leads FOR UPDATE
USING (is_admin() OR agent_id = auth.uid());

CREATE POLICY "Leads: Agents create"
ON leads FOR INSERT
WITH CHECK (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Leads: Admins delete"
ON leads FOR DELETE
USING (is_admin());

-- ============================================
-- CONTACTS: Based on created_by ownership
-- ============================================
DROP POLICY IF EXISTS "agents read own contacts" ON contacts;
DROP POLICY IF EXISTS "agents insert contacts" ON contacts;
DROP POLICY IF EXISTS "agents update contacts" ON contacts;

CREATE POLICY "Contacts: Agents view own, Admins view all"
ON contacts FOR SELECT
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Contacts: Agents edit own, Admins edit all"
ON contacts FOR UPDATE
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Contacts: Agents create"
ON contacts FOR INSERT
WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Contacts: Admins delete"
ON contacts FOR DELETE
USING (is_admin());

-- ============================================
-- PROPERTIES: Agents READ ALL, only Admins EDIT
-- ============================================
DROP POLICY IF EXISTS "auto_merged_select_authenticated" ON properties;
DROP POLICY IF EXISTS "Agents or admins can update properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can create properties" ON properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON properties;

CREATE POLICY "Properties: All agents can view"
ON properties FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()) OR is_admin()
);

CREATE POLICY "Properties: Only admins edit"
ON properties FOR UPDATE
USING (is_admin());

CREATE POLICY "Properties: Only admins create"
ON properties FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Properties: Only admins delete"
ON properties FOR DELETE
USING (is_admin());

-- ============================================
-- CONTACT FILES: Agents see only uploaded by them
-- ============================================
DROP POLICY IF EXISTS "Agents can view related contact files" ON contact_files;
DROP POLICY IF EXISTS "Agents can update related contact files" ON contact_files;
DROP POLICY IF EXISTS "Agents can delete related contact files" ON contact_files;
DROP POLICY IF EXISTS "Authenticated users can create contact files" ON contact_files;

-- Add created_by if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contact_files' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE contact_files ADD COLUMN created_by uuid REFERENCES auth.users(id);
    UPDATE contact_files SET created_by = (SELECT agent_id FROM leads WHERE id = contact_files.contact_id LIMIT 1);
  END IF;
END $$;

CREATE POLICY "Contact Files: View own uploads or admin"
ON contact_files FOR SELECT
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Contact Files: Edit own uploads or admin"
ON contact_files FOR UPDATE
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Contact Files: Delete own uploads or admin"
ON contact_files FOR DELETE
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Contact Files: Agents can upload"
ON contact_files FOR INSERT
WITH CHECK (created_by = auth.uid() OR is_admin());

-- ============================================
-- PROPERTY FILES: Agents see only uploaded by them
-- ============================================
DROP POLICY IF EXISTS "Agents can view related property files" ON property_files;
DROP POLICY IF EXISTS "Agents can update related property files" ON property_files;
DROP POLICY IF EXISTS "Agents can delete related property files" ON property_files;
DROP POLICY IF EXISTS "Authenticated users can create property files" ON property_files;

-- Add created_by if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_files' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE property_files ADD COLUMN created_by uuid REFERENCES auth.users(id);
    UPDATE property_files SET created_by = (SELECT agent_id FROM properties WHERE id = property_files.property_id LIMIT 1);
  END IF;
END $$;

CREATE POLICY "Property Files: View own uploads or admin"
ON property_files FOR SELECT
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Property Files: Edit own uploads or admin"
ON property_files FOR UPDATE
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Property Files: Delete own uploads or admin"
ON property_files FOR DELETE
USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "Property Files: Only admins can upload"
ON property_files FOR INSERT
WITH CHECK (is_admin());

-- ============================================
-- AUDIT LOGGING
-- ============================================
CREATE TABLE IF NOT EXISTS public.access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE public.access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs"
ON access_audit FOR SELECT
USING (is_admin());

CREATE POLICY "System creates audit logs"
ON access_audit FOR INSERT
WITH CHECK (true);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_write_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO access_audit (user_id, action, entity_type, entity_id)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to key tables
DROP TRIGGER IF EXISTS audit_leads_write ON leads;
CREATE TRIGGER audit_leads_write
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_write_operation();

DROP TRIGGER IF EXISTS audit_contacts_write ON contacts;
CREATE TRIGGER audit_contacts_write
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION audit_write_operation();

DROP TRIGGER IF EXISTS audit_properties_write ON properties;
CREATE TRIGGER audit_properties_write
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW EXECUTE FUNCTION audit_write_operation();