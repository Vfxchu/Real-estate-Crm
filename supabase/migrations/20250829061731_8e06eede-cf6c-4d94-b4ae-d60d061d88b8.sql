-- Remove overly permissive policies that allow public access
DROP POLICY IF EXISTS "properties_insert_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_select_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_update_policy" ON public.properties;

-- Add RLS to leads_per_agent_per_month table (currently missing)
ALTER TABLE public.leads_per_agent_per_month ENABLE ROW LEVEL SECURITY;

-- Create secure policy for leads_per_agent_per_month
CREATE POLICY "leads_per_agent_per_month_select_authenticated" 
ON public.leads_per_agent_per_month
FOR SELECT 
USING (auth.uid() IS NOT NULL);