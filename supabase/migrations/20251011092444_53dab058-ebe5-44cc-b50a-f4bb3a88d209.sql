-- Fix profiles table: Ensure only users can see their own profile or admins see all
-- The existing policy looks correct but let's make it more explicit
DROP POLICY IF EXISTS "profiles_select_secure" ON profiles;

CREATE POLICY "profiles_select_own_or_admin" 
ON profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR is_admin()
);

-- Fix properties table: Restrict sensitive property data access
-- Only admins and assigned agents can view properties
DROP POLICY IF EXISTS "properties_select_authenticated" ON properties;

CREATE POLICY "properties_select_agent_or_admin" 
ON properties 
FOR SELECT 
TO authenticated
USING (
  agent_id = auth.uid() OR is_admin()
);

-- Add comment explaining the security model
COMMENT ON POLICY "properties_select_agent_or_admin" ON properties IS 
'Restricts property access to assigned agent or admins only. Sensitive fields like owner_contact_id and permit_number are protected.';