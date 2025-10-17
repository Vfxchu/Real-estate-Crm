-- Create function to sync Owner/Landlord tags from all properties linked to a contact
CREATE OR REPLACE FUNCTION sync_owner_tags_from_properties(p_contact_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_sale BOOLEAN;
  v_has_rent BOOLEAN;
  v_current_tags TEXT[];
  v_new_tags TEXT[];
  v_other_tags TEXT[];
BEGIN
  -- Check if contact has sale properties (as owner)
  SELECT EXISTS (
    SELECT 1 FROM properties p
    JOIN contact_properties cp ON cp.property_id = p.id
    WHERE cp.contact_id = p_contact_id 
      AND cp.role = 'owner'
      AND p.offer_type = 'sale'
  ) INTO v_has_sale;
  
  -- Check if contact has rent properties (as owner)
  SELECT EXISTS (
    SELECT 1 FROM properties p
    JOIN contact_properties cp ON cp.property_id = p.id
    WHERE cp.contact_id = p_contact_id 
      AND cp.role = 'owner'
      AND p.offer_type = 'rent'
  ) INTO v_has_rent;
  
  -- Get current tags from leads table
  SELECT COALESCE(interest_tags, '{}') INTO v_current_tags
  FROM leads WHERE id = p_contact_id;
  
  -- If not found in leads, try contacts table
  IF NOT FOUND THEN
    SELECT COALESCE(interest_tags, '{}') INTO v_current_tags
    FROM contacts WHERE id = p_contact_id;
  END IF;
  
  -- Filter out existing Owner/Landlord tags (case-insensitive), keep all other tags
  SELECT array_agg(tag) INTO v_other_tags
  FROM unnest(v_current_tags) AS tag
  WHERE LOWER(tag) NOT IN ('owner', 'landlord', 'seller');
  
  -- Build new tag set
  v_new_tags := COALESCE(v_other_tags, '{}');
  
  IF v_has_sale THEN
    v_new_tags := array_append(v_new_tags, 'Owner');
  END IF;
  
  IF v_has_rent THEN
    v_new_tags := array_append(v_new_tags, 'Landlord');
  END IF;
  
  -- Update leads table
  UPDATE leads 
  SET interest_tags = v_new_tags
  WHERE id = p_contact_id;
  
  -- Also update contacts table if exists
  UPDATE contacts 
  SET interest_tags = v_new_tags
  WHERE id = p_contact_id;
  
END;
$$;

-- Trigger function for contact_properties changes
CREATE OR REPLACE FUNCTION trigger_sync_owner_tags_on_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sync tags for the affected contact (handles INSERT and DELETE)
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_owner_tags_from_properties(OLD.contact_id);
    RETURN OLD;
  ELSE
    -- Only sync if role is 'owner'
    IF NEW.role = 'owner' THEN
      PERFORM sync_owner_tags_from_properties(NEW.contact_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger function for properties table changes
CREATE OR REPLACE FUNCTION trigger_sync_owner_tags_on_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When property offer_type changes or owner_contact_id changes, sync tags
  IF TG_OP = 'UPDATE' THEN
    -- If offer_type changed and property has an owner
    IF (OLD.offer_type IS DISTINCT FROM NEW.offer_type) AND NEW.owner_contact_id IS NOT NULL THEN
      PERFORM sync_owner_tags_from_properties(NEW.owner_contact_id);
    END IF;
    
    -- If owner changed, sync both old and new owners
    IF OLD.owner_contact_id IS DISTINCT FROM NEW.owner_contact_id THEN
      IF OLD.owner_contact_id IS NOT NULL THEN
        PERFORM sync_owner_tags_from_properties(OLD.owner_contact_id);
      END IF;
      IF NEW.owner_contact_id IS NOT NULL THEN
        PERFORM sync_owner_tags_from_properties(NEW.owner_contact_id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_owner_tags_on_contact_property_change ON contact_properties;
DROP TRIGGER IF EXISTS sync_owner_tags_on_property_change ON properties;

-- Create triggers
CREATE TRIGGER sync_owner_tags_on_contact_property_change
  AFTER INSERT OR DELETE ON contact_properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_owner_tags_on_link();

CREATE TRIGGER sync_owner_tags_on_property_change
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_owner_tags_on_property();

-- Backfill existing data: sync tags for all contacts with properties
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT cp.contact_id
    FROM contact_properties cp
    WHERE cp.role = 'owner'
  LOOP
    PERFORM sync_owner_tags_from_properties(r.contact_id);
  END LOOP;
  
  -- Also handle properties with owner_contact_id but no contact_properties link
  FOR r IN
    SELECT DISTINCT owner_contact_id
    FROM properties
    WHERE owner_contact_id IS NOT NULL
  LOOP
    PERFORM sync_owner_tags_from_properties(r.owner_contact_id);
  END LOOP;
END $$;