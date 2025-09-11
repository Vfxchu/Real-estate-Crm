-- Create trigger function for automatic lead assignment
CREATE OR REPLACE FUNCTION public.auto_assign_lead_to_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-assign if no agent is specified
  IF NEW.agent_id IS NULL THEN
    -- Get the least busy agent
    SELECT user_id INTO NEW.agent_id
    FROM get_least_busy_agent();
    
    -- If no agent found, leave as null (will be handled by application)
    IF NEW.agent_id IS NULL THEN
      RAISE WARNING 'No available agents for auto-assignment';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic lead assignment on insert
DROP TRIGGER IF EXISTS trigger_auto_assign_lead ON public.leads;
CREATE TRIGGER trigger_auto_assign_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_lead_to_agent();