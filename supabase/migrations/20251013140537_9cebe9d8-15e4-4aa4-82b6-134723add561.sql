-- Storage RLS policies for property documents uploads/moves
-- Ensure authenticated users can upload to temp and to property-owned folders; allow read/delete accordingly

-- INSERT policies
DROP POLICY IF EXISTS "property_docs_insert_temp" ON storage.objects;
CREATE POLICY "property_docs_insert_temp"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-docs'
  AND (position('temp/' in name) = 1)
);

DROP POLICY IF EXISTS "property_docs_insert_property_owner" ON storage.objects;
CREATE POLICY "property_docs_insert_property_owner"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-docs'
  AND public.is_valid_uuid_path(name)
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.agent_id = auth.uid() OR public.is_admin())
  )
);

-- SELECT policy (for downloads and creating signed URLs)
DROP POLICY IF EXISTS "property_docs_select_related" ON storage.objects;
CREATE POLICY "property_docs_select_related"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'property-docs'
  AND (
    (position('temp/' in name) = 1)
    OR (
      public.is_valid_uuid_path(name)
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (p.agent_id = auth.uid() OR public.is_admin())
      )
    )
  )
);

-- DELETE policy (remove temp and property files by owner/admin)
DROP POLICY IF EXISTS "property_docs_delete_related" ON storage.objects;
CREATE POLICY "property_docs_delete_related"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'property-docs'
  AND (
    (position('temp/' in name) = 1)
    OR (
      public.is_valid_uuid_path(name)
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (p.agent_id = auth.uid() OR public.is_admin())
      )
    )
  )
);
