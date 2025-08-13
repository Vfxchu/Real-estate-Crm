-- Fix Add Property functionality - Update RLS policies and ensure required columns

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Properties select" ON public.properties;
DROP POLICY IF EXISTS "Properties insert" ON public.properties;
DROP POLICY IF EXISTS "Properties update" ON public.properties;
DROP POLICY IF EXISTS "Properties delete" ON public.properties;

-- Create new RLS policies as specified
CREATE POLICY "agent insert own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = agent_id OR public.get_current_user_role() = 'admin');

CREATE POLICY "agent read own + admin read all" ON public.properties
  FOR SELECT USING (agent_id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "agent update own" ON public.properties
  FOR UPDATE USING (agent_id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "agent delete own" ON public.properties
  FOR DELETE USING (agent_id = auth.uid() OR public.get_current_user_role() = 'admin');

-- Ensure required columns exist with proper constraints
ALTER TABLE public.properties 
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN address SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN state SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN offer_type SET NOT NULL,
  ALTER COLUMN price SET NOT NULL;

-- Add default value for agent_id if not already set
ALTER TABLE public.properties 
  ALTER COLUMN agent_id SET DEFAULT auth.uid();

-- Ensure agent_id is not null
ALTER TABLE public.properties 
  ALTER COLUMN agent_id SET NOT NULL;