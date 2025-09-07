-- SECURITY FIXES - Step 4: Remove duplicate function by OID and apply fixes

-- Drop the specific function with uuid parameter using OID
DROP FUNCTION public.get_current_user_role(uuid) CASCADE;

-- Now update the remaining function to use secure implementation
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- First try the new secure user_roles table
    SELECT role::text INTO user_role 
    FROM public.user_roles 
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Fallback to profiles table if no role found in user_roles
    IF user_role IS NULL THEN
        SELECT role INTO user_role 
        FROM public.profiles 
        WHERE user_id = auth.uid();
    END IF;
    
    -- Default to agent if no role found
    RETURN COALESCE(user_role, 'agent');
END;
$$;

-- Now that we have a clean function, let's recreate the policies that were dropped
-- Recreate leads policies
CREATE POLICY "leads_insert_self_or_admin" 
ON public.leads 
FOR INSERT 
WITH CHECK (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

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

CREATE POLICY "leads_delete_own_or_admin" 
ON public.leads 
FOR DELETE 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

-- Recreate deals policies
CREATE POLICY "deals_select_own_or_admin" 
ON public.deals 
FOR SELECT 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

CREATE POLICY "deals_insert_self_or_admin" 
ON public.deals 
FOR INSERT 
WITH CHECK (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);

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

CREATE POLICY "deals_delete_own_or_admin" 
ON public.deals 
FOR DELETE 
USING (
    agent_id = auth.uid() OR 
    public.get_current_user_role() = 'admin'
);