-- Create a security definer function to get public user info (names and admin status)
-- This allows all authenticated users to see user names without weakening RLS on profiles
CREATE OR REPLACE FUNCTION public.get_user_public_info(user_ids uuid[])
RETURNS TABLE (user_id uuid, name text, is_admin boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.name,
    EXISTS (
      SELECT 1 
      FROM user_roles ur 
      WHERE ur.user_id = p.user_id 
        AND ur.role = 'admin'
    ) AS is_admin
  FROM profiles p
  WHERE p.user_id = ANY (user_ids)
$$;