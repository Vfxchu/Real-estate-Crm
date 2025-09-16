-- First, let's check if we have any existing users and set up admin access
-- Get the user ID of the first registered user to make them admin

-- Insert admin role for the first user (you can modify the email to match your signup)
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
    p.user_id,
    'admin'::app_role,
    p.user_id  -- Self-assigned during initial setup
FROM public.profiles p
WHERE p.email = 'admin@dkvrealestate.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update the profile role for consistency 
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'admin@dkvrealestate.com';

-- If you want to make any other user an admin, you can run:
-- Replace 'your-email@example.com' with the actual email
-- INSERT INTO public.user_roles (user_id, role, assigned_by)
-- SELECT user_id, 'admin'::app_role, user_id
-- FROM public.profiles 
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;