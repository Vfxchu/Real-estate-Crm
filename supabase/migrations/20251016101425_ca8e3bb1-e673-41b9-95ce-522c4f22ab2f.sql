-- Ensure RLS is enabled
ALTER TABLE public.contact_properties ENABLE ROW LEVEL SECURITY;

-- Add an explicit PERMISSIVE SELECT policy to avoid 403s when only restrictive ALL policies exist
DROP POLICY IF EXISTS "contact_properties_select_unified" ON public.contact_properties;
CREATE POLICY "contact_properties_select_unified"
ON public.contact_properties
FOR SELECT
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = contact_properties.contact_id
      AND l.agent_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_properties.contact_id
      AND c.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = contact_properties.property_id
      AND p.agent_id = auth.uid()
  )
);
