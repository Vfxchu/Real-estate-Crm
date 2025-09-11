-- Complete CRM Database Setup for New Supabase Instance (Clean Version)
-- This will set up a clean, secure database with proper RLS policies

-- First, drop all existing tables if they exist (clean slate)
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.contact_files CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profile_audit CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.property_files CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.audit_profile_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_agent() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_least_busy_agent() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.lead_source_enum CASCADE;

-- Create custom types
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');
CREATE TYPE public.lead_source_enum AS ENUM ('website', 'referral', 'advertisement', 'cold_call', 'social_media', 'other');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'agent',
    avatar_url text,
    phone text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_roles table for advanced role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'agent',
    assigned_by uuid REFERENCES auth.users(id),
    assigned_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Create leads table with proper structure
CREATE TABLE public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    agent_id uuid REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'new',
    priority text NOT NULL DEFAULT 'medium',
    contact_status text DEFAULT 'lead',
    source lead_source_enum NOT NULL DEFAULT 'referral',
    lead_source text,
    interested_in text,
    budget_range text,
    budget_sale_band text,
    budget_rent_band text,
    location_address text,
    location_place_id text,
    location_lat numeric,
    location_lng numeric,
    bedrooms text,
    size_band text,
    segment text,
    subtype text,
    category text,
    contact_pref text[],
    interest_tags text[],
    tags text[],
    notes text,
    follow_up_date timestamptz,
    score integer DEFAULT 0,
    custom_fields jsonb DEFAULT '{}',
    merged_into_id uuid REFERENCES public.leads(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text,
    unit_number text,
    property_type text NOT NULL,
    offer_type text NOT NULL,
    status text NOT NULL DEFAULT 'available',
    price numeric NOT NULL,
    bedrooms integer,
    bathrooms integer,
    area_sqft integer,
    segment text,
    subtype text,
    permit_number text,
    featured boolean DEFAULT false,
    images text[],
    location_place_id text,
    location_lat numeric,
    location_lng numeric,
    owner_contact_id uuid REFERENCES public.leads(id),
    agent_id uuid NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create deals table
CREATE TABLE public.deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    contact_id uuid NOT NULL REFERENCES public.leads(id),
    property_id uuid REFERENCES public.properties(id),
    agent_id uuid NOT NULL REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'prospecting',
    value numeric,
    currency text DEFAULT 'USD',
    probability integer DEFAULT 0,
    close_date date,
    source text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type text NOT NULL,
    description text NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    event_type text NOT NULL,
    status text NOT NULL DEFAULT 'scheduled',
    start_date timestamptz NOT NULL,
    end_date timestamptz,
    location text,
    notes text,
    agent_id uuid NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    lead_id uuid REFERENCES public.leads(id),
    property_id uuid REFERENCES public.properties(id),
    contact_id uuid REFERENCES public.leads(id),
    deal_id uuid REFERENCES public.deals(id),
    created_by uuid NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    reminder_minutes integer DEFAULT 15,
    notification_sent boolean DEFAULT false,
    is_recurring boolean DEFAULT false,
    recurrence_pattern text,
    recurrence_end_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    priority text NOT NULL DEFAULT 'medium',
    is_read boolean DEFAULT false,
    lead_id uuid REFERENCES public.leads(id),
    property_id uuid REFERENCES public.properties(id),
    deal_id uuid REFERENCES public.deals(id),
    event_id uuid REFERENCES public.calendar_events(id),
    scheduled_for timestamptz,
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.leads(id),
    agent_id uuid REFERENCES auth.users(id),
    property_id uuid REFERENCES public.properties(id),
    deal_id uuid REFERENCES public.deals(id),
    type text NOT NULL,
    amount numeric,
    currency text,
    status text,
    notes text,
    -- KYC fields
    source_of_funds text,
    nationality text,
    id_type text,
    id_number text,
    id_expiry date,
    pep boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contact_files table
CREATE TABLE public.contact_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL REFERENCES public.leads(id),
    property_id uuid REFERENCES public.properties(id),
    name text NOT NULL,
    type text NOT NULL,
    path text NOT NULL,
    source text NOT NULL DEFAULT 'manual',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create property_files table
CREATE TABLE public.property_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES public.properties(id),
    name text NOT NULL,
    type text NOT NULL,
    path text NOT NULL,
    size bigint,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create profile_audit table
CREATE TABLE public.profile_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    old_role text,
    new_role text,
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamptz DEFAULT now()
);

-- Create secure functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('agent', 'admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_least_busy_agent()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM profiles p
  LEFT JOIN leads l ON p.user_id = l.agent_id AND l.status NOT IN ('won', 'lost')
  WHERE p.role = 'agent' AND p.status = 'active'
  GROUP BY p.user_id, p.created_at
  ORDER BY COUNT(l.id) ASC, p.created_at ASC
  LIMIT 1;
$$;

-- Create function for calendar events with details
CREATE OR REPLACE FUNCTION public.get_calendar_events_with_details(
  start_date_param timestamptz DEFAULT NULL,
  end_date_param timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  event_type text,
  status text,
  start_date timestamptz,
  end_date timestamptz,
  location text,
  notes text,
  agent_id uuid,
  agent_name text,
  lead_id uuid,
  lead_name text,
  lead_email text,
  property_id uuid,
  property_title text,
  property_address text,
  deal_id uuid,
  deal_title text,
  reminder_minutes integer,
  notification_sent boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.event_type,
    ce.status,
    ce.start_date,
    ce.end_date,
    ce.location,
    ce.notes,
    ce.agent_id,
    p.name as agent_name,
    ce.lead_id,
    l.name as lead_name,
    l.email as lead_email,
    ce.property_id,
    pr.title as property_title,
    pr.address as property_address,
    ce.deal_id,
    d.title as deal_title,
    ce.reminder_minutes,
    ce.notification_sent
  FROM calendar_events ce
  LEFT JOIN profiles p ON ce.agent_id = p.user_id
  LEFT JOIN leads l ON ce.lead_id = l.id
  LEFT JOIN properties pr ON ce.property_id = pr.id
  LEFT JOIN deals d ON ce.deal_id = d.id
  WHERE 
    (start_date_param IS NULL OR ce.start_date >= start_date_param)
    AND (end_date_param IS NULL OR ce.start_date <= end_date_param)
    AND (ce.agent_id = auth.uid() OR public.is_admin())
  ORDER BY ce.start_date ASC;
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create profiles" ON public.profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (is_admin());

-- RLS Policies for user_roles
CREATE POLICY "Users can view user roles" ON public.user_roles
FOR SELECT USING (is_agent());

CREATE POLICY "Admins can create user roles" ON public.user_roles
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update user roles" ON public.user_roles
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete user roles" ON public.user_roles
FOR DELETE USING (is_admin());

-- RLS Policies for leads (agent can only see their assigned leads)
CREATE POLICY "Agents can view their assigned leads" ON public.leads
FOR SELECT USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create leads" ON public.leads
FOR INSERT WITH CHECK (is_agent());

CREATE POLICY "Agents can update their assigned leads" ON public.leads
FOR UPDATE USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can delete their assigned leads" ON public.leads
FOR DELETE USING (agent_id = auth.uid() OR is_admin());

-- RLS Policies for properties (agent can only see their properties)
CREATE POLICY "Agents can view their properties" ON public.properties
FOR SELECT USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can create properties" ON public.properties
FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their properties" ON public.properties
FOR UPDATE USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can delete their properties" ON public.properties
FOR DELETE USING (agent_id = auth.uid() OR is_admin());

-- RLS Policies for deals
CREATE POLICY "Agents can view their deals" ON public.deals
FOR SELECT USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can create deals" ON public.deals
FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their deals" ON public.deals
FOR UPDATE USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can delete their deals" ON public.deals
FOR DELETE USING (agent_id = auth.uid() OR is_admin());

-- RLS Policies for activities
CREATE POLICY "Users can view activities they created" ON public.activities
FOR SELECT USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Users can create activities" ON public.activities
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update activities they created" ON public.activities
FOR UPDATE USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Users can delete activities they created" ON public.activities
FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- RLS Policies for calendar_events
CREATE POLICY "Agents can view their calendar events" ON public.calendar_events
FOR SELECT USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can create calendar events" ON public.calendar_events
FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their calendar events" ON public.calendar_events
FOR UPDATE USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can delete their calendar events" ON public.calendar_events
FOR DELETE USING (agent_id = auth.uid() OR is_admin());

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications" ON public.notifications
FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for transactions (strict access)
CREATE POLICY "Agents can view transactions for their leads" ON public.transactions
FOR SELECT USING (
  agent_id = auth.uid() OR 
  is_admin() OR
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.agent_id = auth.uid())
);

CREATE POLICY "Agents can create transactions for their leads" ON public.transactions
FOR INSERT WITH CHECK (
  agent_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.agent_id = auth.uid())
);

CREATE POLICY "Agents can update transactions for their leads" ON public.transactions
FOR UPDATE USING (
  agent_id = auth.uid() OR 
  is_admin() OR
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.agent_id = auth.uid())
);

CREATE POLICY "Agents can delete transactions for their leads" ON public.transactions
FOR DELETE USING (
  agent_id = auth.uid() OR 
  is_admin() OR
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.agent_id = auth.uid())
);

-- RLS Policies for contact_files
CREATE POLICY "Users can view contact files" ON public.contact_files
FOR SELECT USING (is_agent());

CREATE POLICY "Users can create contact files" ON public.contact_files
FOR INSERT WITH CHECK (is_agent());

CREATE POLICY "Users can update contact files" ON public.contact_files
FOR UPDATE USING (is_agent());

CREATE POLICY "Users can delete contact files" ON public.contact_files
FOR DELETE USING (is_agent());

-- RLS Policies for property_files
CREATE POLICY "Users can view property files" ON public.property_files
FOR SELECT USING (is_agent());

CREATE POLICY "Users can create property files" ON public.property_files
FOR INSERT WITH CHECK (is_agent());

CREATE POLICY "Users can update property files" ON public.property_files
FOR UPDATE USING (is_agent());

CREATE POLICY "Users can delete property files" ON public.property_files
FOR DELETE USING (is_agent());

-- RLS Policies for profile_audit
CREATE POLICY "Admins can view profile audit" ON public.profile_audit
FOR SELECT USING (is_admin());

CREATE POLICY "System can create profile audit" ON public.profile_audit
FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with secure defaults
  INSERT INTO public.profiles (user_id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'agent',  -- Always default to agent, admins must be promoted
    'active'
  );
  
  -- Create user role entry
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (
    NEW.id,
    'agent'::app_role,
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create audit trigger for profile role changes
CREATE OR REPLACE FUNCTION public.audit_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only audit role changes on UPDATE operations
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.profile_audit (
      user_id,
      old_role,
      new_role,
      changed_by
    ) VALUES (
      NEW.user_id,
      OLD.role,
      NEW.role,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_profile_role_changes
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profile_role_change();