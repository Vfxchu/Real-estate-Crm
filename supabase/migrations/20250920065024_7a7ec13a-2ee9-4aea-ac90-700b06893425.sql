-- Contact Master Hub Upgrade Migration

-- 1. Create enums only if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status') THEN
    CREATE TYPE contact_status AS ENUM ('active','past');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status_mode') THEN
    CREATE TYPE contact_status_mode AS ENUM ('auto','manual');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_property_role') THEN
    CREATE TYPE contact_property_role AS ENUM ('owner','buyer_interest','tenant','investor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_file_tag') THEN
    CREATE TYPE contact_file_tag AS ENUM ('id','poa','listing_agreement','tenancy','mou','other');
  END IF;
END $$;

-- 2. Add status management to leads table (treating it as contacts)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status_mode contact_status_mode NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS status_manual contact_status,
  ADD COLUMN IF NOT EXISTS status_effective contact_status NOT NULL DEFAULT 'active';

-- 3. Add marketing fields to leads (for contact functionality)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS marketing_source text,
  ADD COLUMN IF NOT EXISTS buyer_preferences jsonb,
  ADD COLUMN IF NOT EXISTS tenant_preferences jsonb;

-- 4. Create contact-property relationship table
CREATE TABLE IF NOT EXISTS contact_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role contact_property_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, property_id, role)
);

-- 5. Create status change log
CREATE TABLE IF NOT EXISTS contact_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_status contact_status,
  new_status contact_status NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Add tag to contact_files
ALTER TABLE contact_files
  ADD COLUMN IF NOT EXISTS tag contact_file_tag;

-- 7. Helper constants table
CREATE TABLE IF NOT EXISTS _crm_constants (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

INSERT INTO _crm_constants(key, value) VALUES
  ('LEAD_ACTIVE', '["new","contacted","qualified","proposal","negotiation"]'::jsonb),
  ('LEAD_CLOSED', '["won","lost","closed"]'::jsonb),
  ('PROP_OPEN',   '["available","pending","vacant","in_development"]'::jsonb),
  ('PROP_CLOSED', '["sold","rented","off_market"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. Trigger functions for status automation
CREATE OR REPLACE FUNCTION recompute_contact_status(p_contact_id uuid, p_reason text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_mode contact_status_mode;
  v_old contact_status;
  v_new contact_status;
  v_open_leads int;
  v_open_props int;
BEGIN
  SELECT status_mode, status_effective INTO v_mode, v_old
  FROM leads WHERE id = p_contact_id FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  IF v_mode = 'manual' THEN
    RETURN;
  END IF;

  -- Count open leads (for this contact)
  SELECT count(*) INTO v_open_leads
  FROM leads
  WHERE id = p_contact_id
    AND status = ANY(SELECT jsonb_array_elements_text(value) FROM _crm_constants WHERE key='LEAD_ACTIVE');

  -- Count open properties
  SELECT count(*) INTO v_open_props
  FROM contact_properties cp
  JOIN properties p ON p.id = cp.property_id
  WHERE cp.contact_id = p_contact_id
    AND p.status = ANY(SELECT jsonb_array_elements_text(value) FROM _crm_constants WHERE key='PROP_OPEN');

  v_new := CASE WHEN v_open_leads > 0 OR v_open_props > 0 THEN 'active' ELSE 'past' END;

  IF v_new IS DISTINCT FROM v_old THEN
    UPDATE leads SET status_effective = v_new WHERE id = p_contact_id;
    INSERT INTO contact_status_changes(contact_id, old_status, new_status, reason, changed_by)
      VALUES (p_contact_id, v_old, v_new, COALESCE(p_reason,'auto: recompute'), auth.uid());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger for lead status changes
CREATE OR REPLACE FUNCTION on_lead_update_recompute()
RETURNS trigger AS $$
BEGIN
  PERFORM recompute_contact_status(NEW.id, 'lead: status change');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger for property status changes
CREATE OR REPLACE FUNCTION on_property_update_recompute()
RETURNS trigger AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT contact_id FROM contact_properties WHERE property_id = NEW.id LOOP
    PERFORM recompute_contact_status(r.contact_id, 'property: status change');
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create triggers
DROP TRIGGER IF EXISTS trg_lead_update_recompute ON leads;
CREATE TRIGGER trg_lead_update_recompute
AFTER UPDATE OF status ON leads
FOR EACH ROW EXECUTE FUNCTION on_lead_update_recompute();

DROP TRIGGER IF EXISTS trg_prop_update_recompute ON properties;
CREATE TRIGGER trg_prop_update_recompute
AFTER UPDATE OF status ON properties
FOR EACH ROW EXECUTE FUNCTION on_property_update_recompute();

-- 12. RLS policies for new tables
ALTER TABLE contact_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_status_changes ENABLE ROW LEVEL SECURITY;

-- Contact properties policies
CREATE POLICY "Agents can view contact properties" ON contact_properties
FOR SELECT USING (
  contact_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Authenticated users can manage contact properties" ON contact_properties
FOR ALL USING (
  contact_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

-- Status changes policies
CREATE POLICY "Users can view status changes" ON contact_status_changes
FOR SELECT USING (
  contact_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "System can create status changes" ON contact_status_changes
FOR INSERT WITH CHECK (true);

-- 13. Update leads RLS for admin status control
CREATE POLICY "Admins can update contact status" ON leads
FOR UPDATE USING (
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
) WITH CHECK (
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);