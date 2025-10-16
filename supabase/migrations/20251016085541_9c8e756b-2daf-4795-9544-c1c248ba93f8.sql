-- Update RLS policy for leads table to allow agents to delete their own contacts
DROP POLICY IF EXISTS "Only admins can delete leads" ON leads;

-- New policy: Admins can delete all, agents can delete their own
CREATE POLICY "Admins and agents can delete contacts"
ON leads
FOR DELETE
TO authenticated
USING (
  -- Admin can delete all
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'::app_role
  )
  OR
  -- Agents can delete their own contacts
  agent_id = auth.uid()
);