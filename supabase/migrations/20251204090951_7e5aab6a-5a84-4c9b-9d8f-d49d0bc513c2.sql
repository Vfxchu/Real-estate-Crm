-- Update handle_new_user to use role from signup metadata and insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from metadata, default to 'agent'
  user_role := coalesce(new.raw_user_meta_data->>'role', 'agent');
  
  -- Validate role (only allow 'admin' or 'agent')
  IF user_role NOT IN ('admin', 'agent') THEN
    user_role := 'agent';
  END IF;

  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, email, name, phone, status, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.raw_user_meta_data->>'phone',
    'active',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    updated_at = now();

  -- Insert into user_roles table for proper RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;