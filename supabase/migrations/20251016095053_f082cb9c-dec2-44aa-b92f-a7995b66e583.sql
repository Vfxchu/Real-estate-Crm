-- Fix contact_properties to support both leads and contacts tables

-- Drop existing foreign key constraint that only references leads
ALTER TABLE public.contact_properties 
DROP CONSTRAINT IF EXISTS contact_properties_contact_id_fkey;

-- Drop existing policy
DROP POLICY IF EXISTS "contact_properties_all" ON public.contact_properties;

-- Create new unified policy that checks BOTH leads and contacts tables
CREATE POLICY "contact_properties_all_unified"
ON public.contact_properties
FOR ALL
TO authenticated
USING (
  is_admin()
  OR
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = contact_properties.contact_id
    AND l.agent_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_properties.contact_id
    AND c.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = contact_properties.property_id
    AND p.agent_id = auth.uid()
  )
)
WITH CHECK (
  is_admin()
  OR
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = contact_properties.contact_id
    AND l.agent_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_properties.contact_id
    AND c.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = contact_properties.property_id
    AND p.agent_id = auth.uid()
  )
);

-- Function to auto-link property to owner contact
CREATE OR REPLACE FUNCTION public.auto_link_property_to_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only link if owner_contact_id exists in either leads or contacts table
  IF NEW.owner_contact_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.leads WHERE id = NEW.owner_contact_id) 
       OR EXISTS (SELECT 1 FROM public.contacts WHERE id = NEW.owner_contact_id) THEN
      
      INSERT INTO public.contact_properties (contact_id, property_id, role)
      VALUES (NEW.owner_contact_id, NEW.id, 'owner')
      ON CONFLICT (contact_id, property_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on properties insert
DROP TRIGGER IF EXISTS auto_link_owner_on_property_insert ON public.properties;
CREATE TRIGGER auto_link_owner_on_property_insert
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_property_to_owner();

-- Create trigger on properties update
DROP TRIGGER IF EXISTS auto_link_owner_on_property_update ON public.properties;
CREATE TRIGGER auto_link_owner_on_property_update
  AFTER UPDATE OF owner_contact_id ON public.properties
  FOR EACH ROW
  WHEN (NEW.owner_contact_id IS DISTINCT FROM OLD.owner_contact_id)
  EXECUTE FUNCTION public.auto_link_property_to_owner();

-- Backfill existing properties with owners (only valid ones)
INSERT INTO public.contact_properties (contact_id, property_id, role)
SELECT 
  p.owner_contact_id,
  p.id,
  'owner'
FROM public.properties p
WHERE p.owner_contact_id IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM public.leads WHERE id = p.owner_contact_id)
    OR EXISTS (SELECT 1 FROM public.contacts WHERE id = p.owner_contact_id)
  )
ON CONFLICT (contact_id, property_id, role) DO NOTHING;