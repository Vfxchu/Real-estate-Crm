-- Comprehensive Security Fix for Profiles and Transactions Tables
-- This migration ensures strict RLS policies are in place and no unauthorized access is possible

-- ============================================
-- 1. Ensure RLS is enabled on critical tables
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Drop and recreate profiles policies with explicit restrictions
-- ============================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_secure" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_secure" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- SELECT: Users can only view their own profile OR admins can view all
CREATE POLICY "profiles_select_secure"
ON public.profiles
FOR SELECT
USING (
  user_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
);

-- UPDATE: Users can only update their own profile OR admins can update all
CREATE POLICY "profiles_update_secure"
ON public.profiles
FOR UPDATE
USING (
  user_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
);

-- INSERT: Block all inserts except through trigger (handled by handle_new_user)
-- No policy needed as we want this handled by the auth trigger only

-- DELETE: Only admins can delete profiles
CREATE POLICY "profiles_delete_admin_only"
ON public.profiles
FOR DELETE
USING ((SELECT is_admin()));

-- ============================================
-- 3. Strengthen transactions table RLS
-- ============================================
DROP POLICY IF EXISTS "transactions_all" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_secure" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_secure" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_secure" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_admin_only" ON public.transactions;

-- SELECT: Only agent who owns the transaction OR admins
CREATE POLICY "transactions_select_secure"
ON public.transactions
FOR SELECT
USING (
  agent_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
);

-- INSERT: Only authenticated users can create (agent_id must match current user)
CREATE POLICY "transactions_insert_secure"
ON public.transactions
FOR INSERT
WITH CHECK (
  agent_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
);

-- UPDATE: Only agent who owns the transaction OR admins
CREATE POLICY "transactions_update_secure"
ON public.transactions
FOR UPDATE
USING (
  agent_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
)
WITH CHECK (
  agent_id = (SELECT auth.uid())
  OR 
  (SELECT is_admin())
);

-- DELETE: Only admins can delete transactions
CREATE POLICY "transactions_delete_admin_only"
ON public.transactions
FOR DELETE
USING ((SELECT is_admin()));

-- ============================================
-- 4. Add audit logging for profile updates (not selects)
-- ============================================
-- Log whenever profiles are updated, especially by admins
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all profile updates with who made the change
  INSERT INTO public.security_audit (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    (SELECT auth.uid()),
    CASE 
      WHEN (SELECT auth.uid()) != NEW.user_id THEN 'admin_profile_update'
      ELSE 'profile_update'
    END,
    'profiles',
    NEW.user_id::text,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile update logging
DROP TRIGGER IF EXISTS log_profile_updates ON public.profiles;
CREATE TRIGGER log_profile_updates
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_update();

-- ============================================
-- 5. Verify agent_id is not nullable on transactions
-- ============================================
-- This ensures every transaction has an owner
ALTER TABLE public.transactions 
ALTER COLUMN agent_id SET NOT NULL;

-- Add helpful comments
COMMENT ON TABLE public.profiles IS 'Employee profiles - RLS enforces users can only view their own profile unless admin';
COMMENT ON TABLE public.transactions IS 'Financial transactions with KYC data - RLS enforces agent ownership and admin-only deletion';
COMMENT ON POLICY "profiles_select_secure" ON public.profiles IS 'Users can only view their own profile; admins can view all';
COMMENT ON POLICY "transactions_select_secure" ON public.transactions IS 'Agents can only view their own transactions; admins can view all';
