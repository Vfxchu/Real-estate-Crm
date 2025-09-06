-- SECURITY FIXES - Step 1: Update policies to use the correct function

-- Update leads policies to use get_current_user_role() without parameters
DROP POLICY IF EXISTS "leads_insert_self_or_admin" ON public.leads;
CREATE POLICY "leads_insert_self_or_admin" 
ON public.leads 
FOR INSERT 
WITH CHECK (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "leads_update_own_or_admin" ON public.leads;
CREATE POLICY "leads_update_own_or_admin" 
ON public.leads 
FOR UPDATE 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
) 
WITH CHECK (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "leads_delete_own_or_admin" ON public.leads;
CREATE POLICY "leads_delete_own_or_admin" 
ON public.leads 
FOR DELETE 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

-- Update deals policies
DROP POLICY IF EXISTS "deals_select_own_or_admin" ON public.deals;
CREATE POLICY "deals_select_own_or_admin" 
ON public.deals 
FOR SELECT 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "deals_insert_self_or_admin" ON public.deals;
CREATE POLICY "deals_insert_self_or_admin" 
ON public.deals 
FOR INSERT 
WITH CHECK (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "deals_update_own_or_admin" ON public.deals;
CREATE POLICY "deals_update_own_or_admin" 
ON public.deals 
FOR UPDATE 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
) 
WITH CHECK (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "deals_delete_own_or_admin" ON public.deals;
CREATE POLICY "deals_delete_own_or_admin" 
ON public.deals 
FOR DELETE 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

-- Now drop the old function with parameters
DROP FUNCTION IF EXISTS public.get_current_user_role(uuid) CASCADE;