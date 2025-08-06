-- Fix infinite recursion in profiles policy by using a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    RETURN user_role;
END;
$$;

-- Update profiles policy to use the security definer function
DROP POLICY IF EXISTS "View profiles based on role" ON public.profiles;
CREATE POLICY "View profiles based on role"
ON public.profiles
FOR SELECT
USING (
    user_id = auth.uid()
    OR
    public.get_current_user_role() = 'admin'
);