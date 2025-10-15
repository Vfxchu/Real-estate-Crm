-- Drop the existing policy that allows both owners and admins to delete
DROP POLICY IF EXISTS "properties_delete_owner_or_admin" ON public.properties;

-- Create a new policy that only allows admins to delete properties
CREATE POLICY "properties_delete_admin_only" 
ON public.properties
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
  )
);