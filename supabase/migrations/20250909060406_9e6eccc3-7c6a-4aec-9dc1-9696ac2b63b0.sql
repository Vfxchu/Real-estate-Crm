-- Enable RLS and create policies for all tables
-- This fixes the critical security warnings

-- Enable RLS on all tables
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role safely
CREATE OR REPLACE FUNCTION public.get_user_role_secure()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Activities policies
CREATE POLICY "Users can view activities they created or are agents" ON public.activities
FOR SELECT USING (created_by = auth.uid() OR public.is_agent());

CREATE POLICY "Agents can create activities" ON public.activities
FOR INSERT WITH CHECK (public.is_agent() AND created_by = auth.uid());

CREATE POLICY "Users can update activities they created" ON public.activities
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete activities they created" ON public.activities
FOR DELETE USING (created_by = auth.uid());

-- Calendar events policies
CREATE POLICY "Users can view their own calendar events" ON public.calendar_events
FOR SELECT USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create their own calendar events" ON public.calendar_events
FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update their own calendar events" ON public.calendar_events
FOR UPDATE USING (agent_id = auth.uid());

CREATE POLICY "Users can delete their own calendar events" ON public.calendar_events
FOR DELETE USING (agent_id = auth.uid());

-- Contact files policies
CREATE POLICY "Users can view contact files" ON public.contact_files
FOR SELECT USING (public.is_agent());

CREATE POLICY "Users can create contact files" ON public.contact_files
FOR INSERT WITH CHECK (public.is_agent());

CREATE POLICY "Users can update contact files" ON public.contact_files
FOR UPDATE USING (public.is_agent());

CREATE POLICY "Users can delete contact files" ON public.contact_files
FOR DELETE USING (public.is_agent());

-- Deals policies
CREATE POLICY "Users can view deals they manage" ON public.deals
FOR SELECT USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create deals" ON public.deals
FOR INSERT WITH CHECK (public.is_agent() AND agent_id = auth.uid());

CREATE POLICY "Users can update deals they manage" ON public.deals
FOR UPDATE USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can delete deals they manage" ON public.deals
FOR DELETE USING (agent_id = auth.uid() OR public.is_admin());

-- Leads policies
CREATE POLICY "Users can view leads they manage" ON public.leads
FOR SELECT USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create leads" ON public.leads
FOR INSERT WITH CHECK (public.is_agent());

CREATE POLICY "Users can update leads they manage" ON public.leads
FOR UPDATE USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can delete leads they manage" ON public.leads
FOR DELETE USING (agent_id = auth.uid() OR public.is_admin());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

-- Profile audit policies
CREATE POLICY "Admins can view profile audit" ON public.profile_audit
FOR SELECT USING (public.is_admin());

CREATE POLICY "System can create profile audit" ON public.profile_audit
FOR INSERT WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (public.is_admin());

-- Properties policies
CREATE POLICY "Users can view properties" ON public.properties
FOR SELECT USING (public.is_agent());

CREATE POLICY "Users can create properties" ON public.properties
FOR INSERT WITH CHECK (public.is_agent() AND agent_id = auth.uid());

CREATE POLICY "Users can update properties they manage" ON public.properties
FOR UPDATE USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can delete properties they manage" ON public.properties
FOR DELETE USING (agent_id = auth.uid() OR public.is_admin());

-- Property files policies
CREATE POLICY "Users can view property files" ON public.property_files
FOR SELECT USING (public.is_agent());

CREATE POLICY "Users can create property files" ON public.property_files
FOR INSERT WITH CHECK (public.is_agent());

CREATE POLICY "Users can update property files" ON public.property_files
FOR UPDATE USING (public.is_agent());

CREATE POLICY "Users can delete property files" ON public.property_files
FOR DELETE USING (public.is_agent());

-- Transactions policies
CREATE POLICY "Users can view transactions they manage" ON public.transactions
FOR SELECT USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create transactions" ON public.transactions
FOR INSERT WITH CHECK (public.is_agent());

CREATE POLICY "Users can update transactions they manage" ON public.transactions
FOR UPDATE USING (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can delete transactions they manage" ON public.transactions
FOR DELETE USING (agent_id = auth.uid() OR public.is_admin());

-- User roles policies
CREATE POLICY "Users can view user roles" ON public.user_roles
FOR SELECT USING (public.is_agent());

CREATE POLICY "Admins can create user roles" ON public.user_roles
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user roles" ON public.user_roles
FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete user roles" ON public.user_roles
FOR DELETE USING (public.is_admin());