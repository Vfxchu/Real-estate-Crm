-- Remove overly permissive policies that allow public access to properties
DROP POLICY IF EXISTS "properties_insert_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_select_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_update_policy" ON public.properties;