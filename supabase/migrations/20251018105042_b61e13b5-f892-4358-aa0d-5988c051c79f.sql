-- Recreate get_user_public_info with email included
DROP FUNCTION IF EXISTS public.get_user_public_info(uuid[]);

CREATE FUNCTION public.get_user_public_info(user_ids uuid[])
RETURNS TABLE(user_id uuid, name text, email text, is_admin boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.name,
    p.email,
    EXISTS (
      SELECT 1 
      FROM user_roles ur 
      WHERE ur.user_id = p.user_id 
        AND ur.role = 'admin'
    ) AS is_admin
  FROM profiles p
  WHERE p.user_id = ANY (user_ids);
$function$;