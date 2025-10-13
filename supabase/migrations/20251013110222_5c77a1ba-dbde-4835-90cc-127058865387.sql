-- Ensure authenticated users can read from property-layouts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can read property layouts'
  ) THEN
    CREATE POLICY "Authenticated users can read property layouts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'property-layouts');
  END IF;
END $$;

-- Ensure authenticated users can upload to property-layouts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload property layouts'
  ) THEN
    CREATE POLICY "Authenticated users can upload property layouts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'property-layouts');
  END IF;
END $$;

-- Ensure authenticated users can delete their own property layouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete property layouts'
  ) THEN
    CREATE POLICY "Users can delete property layouts"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'property-layouts');
  END IF;
END $$;