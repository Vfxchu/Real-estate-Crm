-- Phase 2: Fix Security Warnings (Fixed Version)

-- 1. Fix function search path issues - update remaining functions to be secure
CREATE OR REPLACE FUNCTION public.get_least_busy_agent()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    agent_id uuid;
BEGIN
    -- Find agent with fewest active leads (excluding won/lost)
    SELECT p.user_id INTO agent_id
    FROM public.profiles p
    LEFT JOIN public.leads l ON p.user_id = l.agent_id 
        AND l.status NOT IN ('won', 'lost')
    WHERE public.get_user_role_secure(p.user_id) = 'agent' AND p.status = 'active'
    GROUP BY p.user_id, p.created_at
    ORDER BY COUNT(l.id) ASC, p.created_at ASC
    LIMIT 1;
    
    RETURN agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only auto-assign if no agent is specified and user creating is admin
    IF NEW.agent_id IS NULL THEN
        -- Check if creator is admin
        IF public.get_user_role_secure(auth.uid()) = 'admin' THEN
            NEW.agent_id := public.get_least_busy_agent();
        ELSE
            -- If agent creates lead, assign to themselves
            NEW.agent_id := auth.uid();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profile_audit (
    user_id,
    old_role,
    new_role,
    changed_by,
    changed_at
  )
  VALUES (
    OLD.id,
    OLD.role,
    NEW.role,
    auth.uid(),
    now()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.map_status_to_contact_status(lead_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  CASE lead_status
    WHEN 'new' THEN RETURN 'lead';
    WHEN 'contacted','qualified','negotiating' THEN RETURN 'contacted';
    WHEN 'won' THEN RETURN 'active_client';
    WHEN 'lost' THEN RETURN 'past_client';
    ELSE RETURN 'lead';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.leads_sync_contact_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    NEW.contact_status := public.map_status_to_contact_status(NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Add file validation function (check if triggers exist first)
CREATE OR REPLACE FUNCTION public.validate_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    max_size BIGINT := 10485760; -- 10MB
BEGIN
    -- Check file size (if provided)
    IF NEW.size IS NOT NULL AND NEW.size > max_size THEN
        RAISE EXCEPTION 'File size exceeds maximum limit of 10MB';
    END IF;
    
    -- Sanitize file name
    NEW.name := regexp_replace(NEW.name, '[^a-zA-Z0-9._-]', '_', 'g');
    
    RETURN NEW;
END;
$$;

-- 3. Add input sanitization trigger for leads
CREATE OR REPLACE FUNCTION public.sanitize_lead_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Sanitize email
    IF NEW.email IS NOT NULL THEN
        NEW.email := lower(trim(NEW.email));
        -- Basic email validation
        IF NEW.email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
            RAISE EXCEPTION 'Invalid email format';
        END IF;
    END IF;
    
    -- Sanitize phone (remove non-numeric characters except +, -, (, ), spaces)
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := regexp_replace(NEW.phone, '[^0-9+\-\(\)\s]', '', 'g');
    END IF;
    
    -- Sanitize name (remove potentially dangerous characters)
    IF NEW.name IS NOT NULL THEN
        NEW.name := regexp_replace(NEW.name, '[<>"\'';&]', '', 'g');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop and recreate triggers to avoid conflicts
DROP TRIGGER IF EXISTS sanitize_lead_input_trigger ON public.leads;
CREATE TRIGGER sanitize_lead_input_trigger
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_lead_input();