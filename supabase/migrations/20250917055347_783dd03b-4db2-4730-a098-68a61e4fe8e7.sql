-- Fix recursive RLS on user_roles and promote the specified user to admin

-- 1) Replace recursive policies on user_roles with safe versions using has_role()
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles select unified" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Safe SELECT policy
CREATE POLICY "User roles select safe"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
  OR auth.role() = 'service_role'
);

-- Safe INSERT policy
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Safe UPDATE policy
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Safe DELETE policy
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- 2) Update profiles policies to avoid recursion via EXISTS on user_roles
DROP POLICY IF EXISTS "Profiles insert unified" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update unified" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles insert unified"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Profiles update unified"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- 3) Promote the target user to admin in both user_roles and profiles
-- Insert admin role (idempotent)
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT p.user_id, 'admin'::app_role, p.user_id
FROM public.profiles p
WHERE p.email = 'designervfxchu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update profile role for display/routing
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'designervfxchu@gmail.com';
