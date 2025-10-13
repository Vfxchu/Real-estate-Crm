-- Fix the audit function to handle system operations (null user_id)
CREATE OR REPLACE FUNCTION audit_write_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only insert audit record if user_id is available (not a system operation)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO access_audit (user_id, action, entity_type, entity_id)
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Now clean up the stored signed URLs
UPDATE properties
SET images = ARRAY(
  SELECT 
    CASE 
      -- If it's a signed URL, extract the path without token
      WHEN img LIKE '%/storage/v1/object/sign/property-images/%' THEN 
        regexp_replace(img, '.*property-images/(.*)\?.*', '\1')
      -- If it's a public URL, extract the path
      WHEN img LIKE '%/storage/v1/object/public/property-images/%' THEN 
        regexp_replace(img, '.*property-images/(.*)', '\1')
      -- If it's any other storage URL format
      WHEN img LIKE '%/storage/v1/object/property-images/%' THEN 
        regexp_replace(img, '.*property-images/(.*)', '\1')
      -- Otherwise keep as is (already a clean path or external URL)
      ELSE img
    END
  FROM unnest(images) AS img
)
WHERE EXISTS (
  SELECT 1 FROM unnest(images) AS img 
  WHERE img LIKE '%/storage/v1/object/%property-images/%'
);

-- Ensure authenticated users can read from property-images bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can read property images'
  ) THEN
    CREATE POLICY "Authenticated users can read property images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'property-images');
  END IF;
END $$;