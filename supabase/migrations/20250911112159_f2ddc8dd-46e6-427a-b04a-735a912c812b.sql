-- Security Fixes: Add WITH CHECK clauses and wire up audit triggers

-- 1. Fix missing WITH CHECK clauses on UPDATE policies
DROP POLICY IF EXISTS "Agents can update their properties" ON properties;
CREATE POLICY "Agents can update their properties" 
ON properties 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Agents can update their deals" ON deals;
CREATE POLICY "Agents can update their deals" 
ON deals 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Agents can update their assigned leads" ON leads;
CREATE POLICY "Agents can update their assigned leads" 
ON leads 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Agents can update their calendar events" ON calendar_events;
CREATE POLICY "Agents can update their calendar events" 
ON calendar_events 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

-- 2. Wire up the audit trigger for profiles
DROP TRIGGER IF EXISTS audit_profile_role_change_trigger ON profiles;
CREATE TRIGGER audit_profile_role_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_role_change();

-- 3. Add validation trigger to prevent role changes by non-admins
DROP TRIGGER IF EXISTS validate_profile_role_update_trigger ON profiles;
CREATE TRIGGER validate_profile_role_update_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_role_update();