-- Drop the old permissive policy
DROP POLICY IF EXISTS "property_files_select_authenticated" ON property_files;

-- Create new restrictive policy that only allows agents to see their own property files
CREATE POLICY "property_files_select_by_agent"
ON property_files
FOR SELECT
TO authenticated
USING (
  -- Admin can see all files
  is_admin()
  OR
  -- Agent assigned to the property can see files
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_files.property_id
    AND properties.agent_id = auth.uid()
  )
  OR
  -- Creator of the file can see it
  property_files.created_by = auth.uid()
);

-- Update existing rows with NULL created_by to use the property owner's agent_id
UPDATE property_files pf
SET created_by = p.agent_id
FROM properties p
WHERE pf.property_id = p.id
AND pf.created_by IS NULL;