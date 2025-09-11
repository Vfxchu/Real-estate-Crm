-- CRITICAL SECURITY FIXES

-- 1. Fix privilege escalation: Remove ability for users to change their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new restrictive policy that prevents role changes
CREATE POLICY "Users can update their own profile (excluding role)" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND OLD.role = NEW.role  -- Prevent role changes
);

-- 2. Fix admin role checking to use secure user_roles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  );
$$;

-- 3. Fix agent role checking to use secure user_roles table  
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('agent', 'admin')
  );
$$;

-- 4. Restrict user_roles visibility - only allow viewing own role or admin access
DROP POLICY IF EXISTS "Users can view user roles" ON public.user_roles;

CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (is_admin());

-- 5. Secure storage buckets - make them private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('avatars', 'property-images');

-- 6. Create secure storage policies for private buckets
-- Avatars bucket policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Users can view their own avatars" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Property images bucket policies
CREATE POLICY "Agents can view property images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-images' 
  AND is_agent()
);

CREATE POLICY "Agents can upload property images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-images' 
  AND is_agent()
);

CREATE POLICY "Agents can update property images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-images' 
  AND is_agent()
);

-- 7. Add admin-only role assignment policy
CREATE POLICY "Only admins can assign roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (is_admin());

-- 8. Ensure new users get proper role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile with secure defaults
  INSERT INTO public.profiles (user_id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'agent',  -- Always default to agent
    'active'
  );
  
  -- Create user role entry (this is the authoritative source)
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (
    NEW.id,
    'agent'::app_role,
    NEW.id
  ) ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;