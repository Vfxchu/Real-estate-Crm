-- Phase 1: Critical Security Fixes (Safe Migration)

-- 1. Create user_roles table to prevent role escalation
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

-- 2. Create secure function to get user role from new table
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
    
    -- Fallback to profiles table if no role found in user_roles
    IF user_role IS NULL THEN
        SELECT role INTO user_role 
        FROM public.profiles 
        WHERE user_id = user_uuid;
    END IF;
    
    -- Default to agent if no role found
    RETURN COALESCE(user_role, 'agent');
END;
$$;

-- 3. Update existing get_current_user_role function to use new secure approach
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

-- 4. Migrate existing role data from profiles to user_roles BEFORE adding triggers
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT user_id, role::app_role, created_at
FROM public.profiles
WHERE role IN ('admin', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create trigger to prevent unauthorized role changes (AFTER migration)
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only admins can assign roles
    IF public.get_user_role_secure(auth.uid()) != 'admin' THEN
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

-- 6. Create RLS policies AFTER migration
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

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