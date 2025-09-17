-- Enable admin overrides and flexible inserts for leads, properties, and calendar events
-- so Admins can create, view, and manage records for any agent.

-- 1) LEADS
-- Add admin SELECT and broaden INSERT/UPDATE policies
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='leads' AND policyname='Agents can view assigned leads'
  ) THEN
    -- keep existing policy, add an admin view policy alongside
    NULL;
  END IF;
END $$;

-- Admins can view all leads
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.get_current_user_role() IN ('admin','superadmin')
);

-- Broaden INSERT to allow admin to insert for any agent
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.leads;
CREATE POLICY "Authenticated users can create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

-- Broaden UPDATE to allow admin to update any lead
DROP POLICY IF EXISTS "Agents can update assigned leads" ON public.leads;
CREATE POLICY "Agents or admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
)
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

-- Keep existing delete for admins, ensure it exists
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','superadmin'));

-- 2) PROPERTIES
-- Admins can view all properties
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  public.get_current_user_role() IN ('admin','superadmin')
);

-- Broaden INSERT to allow admin create for any agent
DROP POLICY IF EXISTS "Authenticated users can create properties" ON public.properties;
CREATE POLICY "Authenticated users can create properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

-- Broaden UPDATE to allow admin update any property
DROP POLICY IF EXISTS "Agents can update assigned properties" ON public.properties;
CREATE POLICY "Agents or admins can update properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
)
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

-- Keep existing delete for admins, ensure it exists
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;
CREATE POLICY "Admins can delete properties"
ON public.properties
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','superadmin'));

-- 3) CALENDAR EVENTS
-- Allow admins to view, create for others, and manage any event
DROP POLICY IF EXISTS "Authenticated users can create calendar events" ON public.calendar_events;
CREATE POLICY "Users or admins can create calendar events"
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

DROP POLICY IF EXISTS "Users can view own calendar events" ON public.calendar_events;
CREATE POLICY "Users or admins can view calendar events"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

DROP POLICY IF EXISTS "Users can update own calendar events" ON public.calendar_events;
CREATE POLICY "Users or admins can update calendar events"
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
)
WITH CHECK (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.calendar_events;
CREATE POLICY "Users or admins can delete calendar events"
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

-- 4) DEALS
-- Allow admins to view and update any deal (delete policy already exists for admins)
DROP POLICY IF EXISTS "Agents can view assigned deals" ON public.deals;
CREATE POLICY "Agents or admins can view deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

DROP POLICY IF EXISTS "Agents can update assigned deals" ON public.deals;
CREATE POLICY "Agents or admins can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
)
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.deals;
CREATE POLICY "Users or admins can create deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);

-- 5) ACTIVITIES: broaden update to admins (delete already allows admins)
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
CREATE POLICY "Users or admins can update activities"
ON public.activities
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
)
WITH CHECK (
  created_by = auth.uid() OR public.get_current_user_role() IN ('admin','superadmin')
);
