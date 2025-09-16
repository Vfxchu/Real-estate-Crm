-- Fix critical security issue: Remove overly permissive profile access policy
-- and replace with proper access controls

-- Drop the problematic policy that allows all authenticated users to read any profile
DROP POLICY IF EXISTS "Profiles select unified" ON public.profiles;

-- Create a proper admin policy for viewing all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])
  OR user_id = auth.uid()
);

-- Note: The "Users can view own profile" policy already exists and is correct
-- This ensures users can only see their own profile data unless they are admins