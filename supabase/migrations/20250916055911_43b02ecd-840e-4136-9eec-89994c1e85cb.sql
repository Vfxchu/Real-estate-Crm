-- Create comprehensive RLS policies for all tables

-- Profiles table policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.get_current_user_role() IN ('admin', 'superadmin'));

-- Leads table policies
CREATE POLICY "Agents can view assigned leads" ON public.leads FOR SELECT USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Agents can update assigned leads" ON public.leads FOR UPDATE USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create leads" ON public.leads FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Properties table policies
CREATE POLICY "Agents can view assigned properties" ON public.properties FOR SELECT USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Agents can update assigned properties" ON public.properties FOR UPDATE USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create properties" ON public.properties FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Deals table policies
CREATE POLICY "Agents can view assigned deals" ON public.deals FOR SELECT USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Agents can update assigned deals" ON public.deals FOR UPDATE USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create deals" ON public.deals FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Calendar events table policies
CREATE POLICY "Users can view own calendar events" ON public.calendar_events FOR SELECT USING (
  agent_id = auth.uid() OR created_by = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Users can update own calendar events" ON public.calendar_events FOR UPDATE USING (
  agent_id = auth.uid() OR created_by = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create calendar events" ON public.calendar_events FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events FOR DELETE USING (
  agent_id = auth.uid() OR created_by = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Activities table policies
CREATE POLICY "Users can view related activities" ON public.activities FOR SELECT USING (
  created_by = auth.uid() OR 
  lead_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Users can update own activities" ON public.activities FOR UPDATE USING (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create activities" ON public.activities FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Transactions table policies
CREATE POLICY "Agents can view related transactions" ON public.transactions FOR SELECT USING (
  agent_id = auth.uid() OR 
  lead_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Agents can update related transactions" ON public.transactions FOR UPDATE USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Notifications table policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
  user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (
  user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Contact files table policies
CREATE POLICY "Agents can view related contact files" ON public.contact_files FOR SELECT USING (
  contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Agents can update related contact files" ON public.contact_files FOR UPDATE USING (
  contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create contact files" ON public.contact_files FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Agents can delete related contact files" ON public.contact_files FOR DELETE USING (
  contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Property files table policies
CREATE POLICY "Agents can view related property files" ON public.property_files FOR SELECT USING (
  property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Agents can update related property files" ON public.property_files FOR UPDATE USING (
  property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Authenticated users can create property files" ON public.property_files FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Agents can delete related property files" ON public.property_files FOR DELETE USING (
  property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- User roles table policies
CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Profile audit table policies
CREATE POLICY "Admins can view profile audit" ON public.profile_audit FOR SELECT USING (
  public.get_current_user_role() IN ('admin', 'superadmin')
);
CREATE POLICY "Admins can create profile audit" ON public.profile_audit FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('admin', 'superadmin')
);

-- Fix search_path for functions by dropping and recreating them
DROP TRIGGER IF EXISTS auto_assign_lead_trigger ON public.leads;
DROP FUNCTION IF EXISTS public.auto_assign_lead() CASCADE;
DROP FUNCTION IF EXISTS public.get_least_busy_agent() CASCADE;

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_least_busy_agent()
RETURNS uuid AS $$
DECLARE
  agent_id uuid;
BEGIN
  SELECT p.user_id INTO agent_id
  FROM public.profiles p
  LEFT JOIN public.leads l ON l.agent_id = p.user_id AND l.status NOT IN ('won', 'lost')
  WHERE p.role = 'agent' AND p.status = 'active'
  GROUP BY p.user_id
  ORDER BY COUNT(l.id) ASC, RANDOM()
  LIMIT 1;
  
  RETURN agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger AS $$
BEGIN
  IF NEW.agent_id IS NULL THEN
    NEW.agent_id := public.get_least_busy_agent();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER auto_assign_lead_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_lead();