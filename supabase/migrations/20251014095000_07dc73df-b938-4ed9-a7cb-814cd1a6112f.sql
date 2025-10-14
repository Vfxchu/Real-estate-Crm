-- Fix download/SELECT permissions for property-docs bucket
-- Allow all authenticated users to SELECT/download files they have access to via property_files table

DROP POLICY IF EXISTS "property_docs_select_related" ON storage.objects;
CREATE POLICY "property_docs_select_authenticated"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'property-docs'
  AND (
    -- Allow temp files
    position('temp/' in name) = 1
    OR
    -- Allow if user is admin
    public.is_admin()
    OR
    -- Allow if user owns the property
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.agent_id = auth.uid()
    )
    OR
    -- Allow if file exists in property_files table (means it's a valid file)
    EXISTS (
      SELECT 1 FROM public.property_files pf
      JOIN public.properties p ON p.id = pf.property_id
      WHERE pf.path = name
        AND (p.agent_id = auth.uid() OR public.is_admin())
    )
  )
);