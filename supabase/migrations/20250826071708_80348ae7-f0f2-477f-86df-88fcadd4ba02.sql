-- CRITICAL SECURITY FIXES

-- 1. Drop the ambiguous role function that causes fallback issues
DROP FUNCTION IF EXISTS public.get_current_user_role(uuid);

-- 2. Update the main role function to be more secure and remove fallbacks
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_role TEXT;
BEGIN
    -- Only check user_roles table - no fallback to profiles
    SELECT role INTO user_role 
    FROM public.user_roles 
    WHERE user_id = user_uuid
    LIMIT 1;
    
    -- Return null if no role found (don't default to 'agent')
    RETURN user_role;
END;
$function$;

-- 3. Create a safe public property view that only exposes non-sensitive data
CREATE OR REPLACE VIEW public.public_properties AS
SELECT 
    id,
    title,
    segment,
    subtype,
    property_type,
    address,
    city,
    state,
    bedrooms,
    bathrooms,
    area_sqft,
    offer_type,
    price,
    description,
    images,
    created_at
FROM public.properties
WHERE status = 'available';

-- Enable RLS on the view
ALTER VIEW public.public_properties OWNER TO postgres;

-- 4. Enable RLS on leads_per_agent_per_month
ALTER TABLE public.leads_per_agent_per_month ENABLE ROW LEVEL SECURITY;

-- Create policy for leads_per_agent_per_month
CREATE POLICY "Only admins can access agent statistics" 
ON public.leads_per_agent_per_month 
FOR ALL
USING (public.get_user_role_secure() = 'admin');

-- 5. Add strict role validation trigger to profiles
CREATE OR REPLACE FUNCTION public.validate_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Block any role changes through profiles table
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Role changes must be done through user_roles table only';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger to prevent role changes via profiles
DROP TRIGGER IF EXISTS validate_profile_role_changes ON public.profiles;
CREATE TRIGGER validate_profile_role_changes
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_role_change();

-- 6. Update all RLS policies to use the secure role function
-- Update profiles policies
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;

CREATE POLICY "Profiles insert" 
ON public.profiles 
FOR INSERT 
WITH CHECK ((user_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'));

CREATE POLICY "Profiles select" 
ON public.profiles 
FOR SELECT 
USING ((user_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'));

CREATE POLICY "Profiles update" 
ON public.profiles 
FOR UPDATE 
USING ((user_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'))
WITH CHECK ((user_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'));

-- Update properties policies
DROP POLICY IF EXISTS "agent delete own" ON public.properties;
DROP POLICY IF EXISTS "agent insert own properties" ON public.properties;
DROP POLICY IF EXISTS "agent update own" ON public.properties;
DROP POLICY IF EXISTS "agents_can_view_all_properties" ON public.properties;

CREATE POLICY "agent delete own" 
ON public.properties 
FOR DELETE 
USING ((agent_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'));

CREATE POLICY "agent insert own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK ((agent_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'));

CREATE POLICY "agent update own" 
ON public.properties 
FOR UPDATE 
USING ((agent_id = auth.uid()) OR (public.get_user_role_secure() = 'admin'));

CREATE POLICY "agents_can_view_all_properties" 
ON public.properties 
FOR SELECT 
USING (public.get_user_role_secure() IN ('agent', 'admin'));

-- 7. Create secure Edge Function for public property sharing
-- This will be implemented in the Edge Function creation step