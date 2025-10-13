-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "properties_select_agent_or_admin" ON public.properties;

-- Create new policy: All authenticated users can view all properties
CREATE POLICY "properties_select_all_authenticated" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (true);

-- Ensure UPDATE is restricted to admin or property owner
DROP POLICY IF EXISTS "properties_update" ON public.properties;
CREATE POLICY "properties_update_owner_or_admin" 
ON public.properties 
FOR UPDATE 
TO authenticated
USING ((agent_id = auth.uid()) OR is_admin())
WITH CHECK ((agent_id = auth.uid()) OR is_admin());

-- Ensure DELETE is restricted to admin or property owner  
DROP POLICY IF EXISTS "properties_delete" ON public.properties;
CREATE POLICY "properties_delete_owner_or_admin" 
ON public.properties 
FOR DELETE 
TO authenticated
USING ((agent_id = auth.uid()) OR is_admin());

-- Ensure INSERT allows authenticated users (agent_id will be set to current user)
DROP POLICY IF EXISTS "properties_write" ON public.properties;
CREATE POLICY "properties_insert_authenticated" 
ON public.properties 
FOR INSERT 
TO authenticated
WITH CHECK (true);