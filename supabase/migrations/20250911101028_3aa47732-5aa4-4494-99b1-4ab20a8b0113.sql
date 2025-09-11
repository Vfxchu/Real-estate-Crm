-- Fix missing profile for existing user
INSERT INTO public.profiles (user_id, email, name, role, status) 
VALUES (
  'c82a013c-e4f4-428c-a606-773970959a76',
  'info@dkvintl.com', 
  'DKV Admin',
  'admin',
  'active'
);

-- Insert user role entry
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES (
  'c82a013c-e4f4-428c-a606-773970959a76',
  'admin'::app_role,
  'c82a013c-e4f4-428c-a606-773970959a76'
);