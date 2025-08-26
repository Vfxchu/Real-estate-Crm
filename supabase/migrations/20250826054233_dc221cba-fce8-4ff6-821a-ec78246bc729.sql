-- Update RLS policies to allow agents to see all properties
DROP POLICY IF EXISTS "agent read own + admin read all" ON public.properties;

CREATE POLICY "agents_can_view_all_properties" 
ON public.properties 
FOR SELECT 
USING (
  -- Agents and admins can view all properties
  public.get_current_user_role(auth.uid()) IN ('agent', 'admin')
);