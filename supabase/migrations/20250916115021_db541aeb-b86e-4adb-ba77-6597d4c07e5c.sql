-- Convert existing user designervfxchu@gmail.com to admin
-- Insert admin role for the existing user
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
    p.user_id,
    'admin'::app_role,
    p.user_id  -- Self-assigned during setup
FROM public.profiles p
WHERE p.email = 'designervfxchu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update the profile role for consistency 
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'designervfxchu@gmail.com';