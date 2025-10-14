-- Update property_files RLS policies to allow all authenticated users to view floor plans
-- while maintaining proper edit/delete restrictions

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "property_files_select" ON property_files;

-- Create new SELECT policy that allows all authenticated users to view floor plans
-- This enables agents to see floor plans in the DKV Inventory for all properties
CREATE POLICY "property_files_select_authenticated" 
ON property_files 
FOR SELECT 
TO authenticated
USING (true);

-- Keep existing INSERT policy (only admins or property owners can upload)
-- No changes needed to property_files_insert

-- Keep existing UPDATE policy (only admins or property owners can update)
-- No changes needed to property_files_update

-- Keep existing DELETE policy (only admins or property owners can delete)
-- No changes needed to property_files_delete

-- Add helpful comment
COMMENT ON POLICY "property_files_select_authenticated" ON property_files IS 
'Allow all authenticated users to view property files (floor plans, layouts). Edit/delete permissions are enforced by separate policies.';