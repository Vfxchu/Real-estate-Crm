-- Fix RLS for document uploads: allow paths like "{propertyId}/{timestamp_filename}"
-- and allow agents (property owners) and admins to manage files.

-- 1) STORAGE policies for bucket 'property-docs'
-- Drop previous strict policies and recreate with relaxed path rules
DROP POLICY IF EXISTS "property_docs_insert_temp" ON storage.objects;
CREATE POLICY "property_docs_insert_temp"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-docs'
  AND position('temp/' in name) = 1
);

DROP POLICY IF EXISTS "property_docs_insert_property_owner" ON storage.objects;
CREATE POLICY "property_docs_insert_property_owner"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-docs'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.agent_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "property_docs_select_related" ON storage.objects;
CREATE POLICY "property_docs_select_related"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'property-docs'
  AND (
    position('temp/' in name) = 1
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (p.agent_id = auth.uid() OR public.is_admin())
      )
    )
  )
);

DROP POLICY IF EXISTS "property_docs_delete_related" ON storage.objects;
CREATE POLICY "property_docs_delete_related"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'property-docs'
  AND (
    position('temp/' in name) = 1
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (p.agent_id = auth.uid() OR public.is_admin())
      )
    )
  )
);

-- 2) PROPERTY_FILES table policies: allow property agents and admins to read/write
-- Drop overly-restrictive single policy and replace with granular policies
DROP POLICY IF EXISTS "property_files_all" ON public.property_files;

-- SELECT: creator, property agent, or admin can view
CREATE POLICY "property_files_select"
ON public.property_files
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_files.property_id
      AND p.agent_id = auth.uid()
  )
);

-- INSERT: creator must be current user (or admin) and file must belong to a property they own or admin
CREATE POLICY "property_files_insert"
ON public.property_files
FOR INSERT TO authenticated
WITH CHECK (
  (public.is_admin() OR created_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id
      AND (p.agent_id = auth.uid() OR public.is_admin())
  )
);

-- UPDATE: same visibility as SELECT
CREATE POLICY "property_files_update"
ON public.property_files
FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_files.property_id
      AND p.agent_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_files.property_id
      AND p.agent_id = auth.uid()
  )
);

-- DELETE: creator, property agent, or admin can delete
CREATE POLICY "property_files_delete"
ON public.property_files
FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_files.property_id
      AND p.agent_id = auth.uid()
  )
);
