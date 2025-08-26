-- Update RLS policies to allow agents to see all properties
DROP POLICY IF EXISTS "agent read own + admin read all" ON public.properties;

CREATE POLICY "agents_can_view_all_properties" 
ON public.properties 
FOR SELECT 
USING (
  -- Agents and admins can view all properties
  public.get_current_user_role() IN ('agent', 'admin')
);

-- Keep existing policies for insert/update/delete (agents can only modify their own)
-- Insert policy stays the same
-- Update policy stays the same  
-- Delete policy stays the same