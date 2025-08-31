-- Create policies for property-images bucket
-- Allow authenticated users to view property images (for agents and admins)
CREATE POLICY "Property images select" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'property-images' AND 
  (
    public.get_user_role_secure(auth.uid()) = 'admin' OR 
    public.get_user_role_secure(auth.uid()) = 'agent'
  )
);

-- Allow authenticated agents/admins to upload property images
CREATE POLICY "Property images insert" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'property-images' AND 
  (
    public.get_user_role_secure(auth.uid()) = 'admin' OR 
    public.get_user_role_secure(auth.uid()) = 'agent'
  )
);

-- Allow users to update their own property images or admins to update any
CREATE POLICY "Property images update" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'property-images' AND 
  (
    public.get_user_role_secure(auth.uid()) = 'admin' OR 
    (auth.uid()::text = (storage.foldername(name))[1])
  )
)
WITH CHECK (
  bucket_id = 'property-images' AND 
  (
    public.get_user_role_secure(auth.uid()) = 'admin' OR 
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

-- Allow users to delete their own property images or admins to delete any
CREATE POLICY "Property images delete" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'property-images' AND 
  (
    public.get_user_role_secure(auth.uid()) = 'admin' OR 
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);