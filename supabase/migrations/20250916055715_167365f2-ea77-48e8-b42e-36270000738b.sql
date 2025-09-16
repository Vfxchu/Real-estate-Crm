-- Create custom types/enums first
CREATE TYPE public.lead_source_enum AS ENUM ('referral', 'website', 'social_media', 'advertisement', 'cold_call', 'email', 'other');
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'user', 'superadmin');

-- Create profiles table first (referenced by many other tables)
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'agent'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'agent'::text, 'superadmin'::text])),
  avatar_url text,
  phone text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create leads table
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'negotiating'::text, 'won'::text, 'lost'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  source public.lead_source_enum NOT NULL DEFAULT 'referral'::public.lead_source_enum,
  agent_id uuid,
  interested_in text,
  budget_range text,
  follow_up_date timestamp with time zone,
  notes text,
  score integer DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  contact_status text DEFAULT 'lead'::text CHECK (contact_status = ANY (ARRAY['lead'::text, 'contacted'::text, 'active_client'::text, 'past_client'::text])),
  tags text[] DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  merged_into_id uuid,
  lead_source text,
  interest_tags text[] DEFAULT '{}'::text[],
  category text CHECK (category = ANY (ARRAY['property'::text, 'requirement'::text])),
  segment text CHECK (segment = ANY (ARRAY['residential'::text, 'commercial'::text])),
  subtype text,
  budget_sale_band text,
  budget_rent_band text,
  bedrooms text,
  size_band text,
  location_place_id text,
  location_lat numeric,
  location_lng numeric,
  location_address text,
  contact_pref text[] DEFAULT '{}'::text[],
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(user_id)
);

-- Create properties table
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  property_type text NOT NULL,
  status text NOT NULL DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'pending'::text, 'sold'::text, 'off_market'::text, 'vacant'::text, 'rented'::text, 'in_development'::text])),
  bedrooms integer,
  bathrooms integer,
  area_sqft integer,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text,
  agent_id uuid NOT NULL DEFAULT auth.uid(),
  images text[],
  featured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  segment text CHECK (segment = ANY (ARRAY['residential'::text, 'commercial'::text])),
  subtype text,
  location_place_id text,
  location_lat numeric,
  location_lng numeric,
  unit_number text,
  offer_type text NOT NULL CHECK (offer_type = ANY (ARRAY['rent'::text, 'sale'::text])),
  permit_number text,
  owner_contact_id uuid,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(user_id),
  CONSTRAINT properties_owner_contact_id_fkey FOREIGN KEY (owner_contact_id) REFERENCES public.leads(id)
);

-- Create deals table
CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  property_id uuid,
  agent_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'prospecting'::text CHECK (status = ANY (ARRAY['prospecting'::text, 'qualified'::text, 'proposal'::text, 'negotiation'::text, 'closed_won'::text, 'closed_lost'::text])),
  value numeric,
  currency text DEFAULT 'USD'::text,
  close_date date,
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  notes text,
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deals_pkey PRIMARY KEY (id),
  CONSTRAINT deals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.leads(id),
  CONSTRAINT deals_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT deals_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(user_id)
);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['property_viewing'::text, 'lead_call'::text, 'contact_meeting'::text, 'follow_up'::text, 'general'::text])),
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text, 'rescheduled'::text])),
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  location text,
  notes text,
  lead_id uuid,
  property_id uuid,
  contact_id uuid,
  deal_id uuid,
  agent_id uuid NOT NULL DEFAULT auth.uid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reminder_minutes integer DEFAULT 15,
  notification_sent boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date timestamp with time zone,
  CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT calendar_events_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT calendar_events_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id)
);

-- Create activities table
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  property_id uuid,
  contact_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['call'::text, 'email'::text, 'meeting'::text, 'note'::text, 'follow_up'::text, 'whatsapp'::text, 'status_change'::text, 'contact_status_change'::text])),
  description text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT activities_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric,
  currency text,
  status text,
  notes text,
  source_of_funds text,
  nationality text,
  id_type text,
  id_number text,
  id_expiry date,
  pep boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  agent_id uuid,
  property_id uuid,
  deal_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT transactions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT transactions_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text, 'reminder'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  is_read boolean DEFAULT false,
  event_id uuid,
  lead_id uuid,
  property_id uuid,
  deal_id uuid,
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.calendar_events(id),
  CONSTRAINT notifications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT notifications_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT notifications_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id)
);

-- Create contact_files table
CREATE TABLE public.contact_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'manual'::text,
  property_id uuid,
  path text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contact_files_pkey PRIMARY KEY (id),
  CONSTRAINT contact_files_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.leads(id),
  CONSTRAINT contact_files_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

-- Create property_files table
CREATE TABLE public.property_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['image'::text, 'layout'::text, 'document'::text])),
  path text NOT NULL,
  name text NOT NULL,
  size bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT property_files_pkey PRIMARY KEY (id),
  CONSTRAINT property_files_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent'::public.app_role,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id),
  CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role)
);

-- Create profile_audit table
CREATE TABLE public.profile_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role text,
  new_role text,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_audit_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_audit ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'agent'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

-- Create function for auto-assigning leads to agents
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create trigger for lead auto-assignment
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger AS $$
BEGIN
  IF NEW.agent_id IS NULL THEN
    NEW.agent_id := public.get_least_busy_agent();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_lead_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_lead();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();