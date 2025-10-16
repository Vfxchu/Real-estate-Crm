-- Create security definer function to check contact_property access without RLS recursion
CREATE OR REPLACE FUNCTION public.can_access_contact_property_link(
  p_user_id uuid,
  p_contact_id uuid,
  p_property_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Admin check
    public.is_admin() OR
    -- Lead agent check
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = p_contact_id AND l.agent_id = p_user_id
    ) OR
    -- Contact creator check
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = p_contact_id AND c.created_by = p_user_id
    ) OR
    -- Property agent check
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = p_property_id AND p.agent_id = p_user_id
    )
  )
$$;

-- Grant execute permissions on required functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_contact_property_link(uuid, uuid, uuid) TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "contact_properties_all_unified" ON public.contact_properties;
DROP POLICY IF EXISTS "contact_properties_select_unified" ON public.contact_properties;

-- Create unified policy using security definer function
CREATE POLICY "contact_properties_all"
ON public.contact_properties
FOR ALL
USING (
  public.can_access_contact_property_link(auth.uid(), contact_id, property_id)
)
WITH CHECK (
  public.can_access_contact_property_link(auth.uid(), contact_id, property_id)
);

-- Grant table-level privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_properties TO authenticated;