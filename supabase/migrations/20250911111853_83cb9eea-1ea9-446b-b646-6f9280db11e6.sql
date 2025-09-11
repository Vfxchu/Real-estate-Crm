-- Security Fixes: Add WITH CHECK clauses and storage RLS policies

-- 1. Fix missing WITH CHECK clauses on UPDATE policies
DROP POLICY IF EXISTS "Agents can update their properties" ON properties;
CREATE POLICY "Agents can update their properties" 
ON properties 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Agents can update their deals" ON deals;
CREATE POLICY "Agents can update their deals" 
ON deals 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Agents can update their assigned leads" ON leads;
CREATE POLICY "Agents can update their assigned leads" 
ON leads 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Agents can update their calendar events" ON calendar_events;
CREATE POLICY "Agents can update their calendar events" 
ON calendar_events 
FOR UPDATE 
USING (agent_id = auth.uid() OR is_admin())
WITH CHECK (agent_id = auth.uid() OR is_admin());

-- 2. Add comprehensive storage RLS policies
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Property images bucket policies (private)
CREATE POLICY "Agents can view property images for their properties" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'property-images' AND (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.agent_id = auth.uid() 
      AND name LIKE '%' || p.id::text || '%'
    ) OR is_admin()
  )
);

CREATE POLICY "Agents can upload property images for their properties" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'property-images' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Agents can update property images for their properties" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'property-images' AND (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.agent_id = auth.uid() 
      AND name LIKE '%' || p.id::text || '%'
    ) OR is_admin()
  )
)
WITH CHECK (
  bucket_id = 'property-images' AND (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.agent_id = auth.uid() 
      AND name LIKE '%' || p.id::text || '%'
    ) OR is_admin()
  )
);

CREATE POLICY "Agents can delete property images for their properties" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'property-images' AND (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.agent_id = auth.uid() 
      AND name LIKE '%' || p.id::text || '%'
    ) OR is_admin()
  )
);

-- Avatar bucket policies (private)
CREATE POLICY "Users can view their own avatar" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Documents bucket policies (private)
CREATE POLICY "Users can view their own documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Wire up the audit trigger for profiles
DROP TRIGGER IF EXISTS audit_profile_role_change_trigger ON profiles;
CREATE TRIGGER audit_profile_role_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_role_change();

-- 4. Add validation trigger to prevent role changes by non-admins
DROP TRIGGER IF EXISTS validate_profile_role_update_trigger ON profiles;
CREATE TRIGGER validate_profile_role_update_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_role_update();