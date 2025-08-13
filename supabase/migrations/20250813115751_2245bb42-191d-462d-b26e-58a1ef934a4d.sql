-- Phase 1: Critical Security Fixes

-- 1. Add RLS to leads_per_agent_per_month table
ALTER TABLE public.leads_per_agent_per_month ENABLE ROW LEVEL SECURITY;

-- Create policy for leads_per_agent_per_month - only admins can access analytics
CREATE POLICY "Analytics access for admins only" 
ON public.leads_per_agent_per_month 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- 2. Create user_roles table to prevent role escalation
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'agent',
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage roles
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Users can view their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- 3. Create secure function to get user role from new table
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.user_roles 
    WHERE user_id = user_uuid
    LIMIT 1;
    
    -- Default to agent if no role found
    RETURN COALESCE(user_role, 'agent');
END;
$$;

-- 4. Update existing get_current_user_role function to use new secure approach
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN public.get_user_role_secure(auth.uid());
END;
$$;

-- 5. Create trigger to prevent unauthorized role changes
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only admins can assign roles
    IF get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can assign roles';
    END IF;
    
    -- Set assigned_by field
    NEW.assigned_by = auth.uid();
    NEW.assigned_at = now();
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_role_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_assignment();

-- 6. Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT user_id, role::app_role, created_at
FROM public.profiles
WHERE role IN ('admin', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Create audit function for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.profile_audit (
            user_id, old_role, new_role, changed_by, changed_at
        ) VALUES (
            NEW.user_id, NULL, NEW.role::TEXT, NEW.assigned_by, NEW.assigned_at
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.profile_audit (
            user_id, old_role, new_role, changed_by, changed_at
        ) VALUES (
            NEW.user_id, OLD.role::TEXT, NEW.role::TEXT, NEW.assigned_by, NEW.assigned_at
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.profile_audit (
            user_id, old_role, new_role, changed_by, changed_at
        ) VALUES (
            OLD.user_id, OLD.role::TEXT, NULL, auth.uid(), now()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_role_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_role_changes();