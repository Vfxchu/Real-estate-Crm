-- Drop existing policies to recreate them with optimized queries
DROP POLICY IF EXISTS "agent read own + admin read all" ON public.properties;
DROP POLICY IF EXISTS "agent insert own properties" ON public.properties;
DROP POLICY IF EXISTS "agent update own" ON public.properties;
DROP POLICY IF EXISTS "agent delete own" ON public.properties;

-- SELECT (agents see own, admins see all)
CREATE POLICY "agent read own + admin read all"
ON public.properties
FOR SELECT
TO authenticated
USING (
  agent_id = (SELECT auth.uid())
  OR public.get_current_user_role() = 'admin'
);

-- INSERT (agents insert own; admins insert any)
CREATE POLICY "agent insert own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = (SELECT auth.uid())
  OR public.get_current_user_role() = 'admin'
);

-- UPDATE (agents update own; admins any)
CREATE POLICY "agent update own"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  agent_id = (SELECT auth.uid())
  OR public.get_current_user_role() = 'admin'
);

-- DELETE (agents delete own; admins any)
CREATE POLICY "agent delete own"
ON public.properties
FOR DELETE
TO authenticated
USING (
  agent_id = (SELECT auth.uid())
  OR public.get_current_user_role() = 'admin'
);

-- Ensure required columns are NOT NULL (don't drop data, only set constraints)
ALTER TABLE public.properties
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN address SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN state SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN offer_type SET NOT NULL,
  ALTER COLUMN price SET NOT NULL;

-- Set sensible default so agents don't have to pass agent_id explicitly
ALTER TABLE public.properties
  ALTER COLUMN agent_id SET DEFAULT auth.uid();