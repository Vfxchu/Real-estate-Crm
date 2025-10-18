-- Data Migration: Fix existing "Owner" tags and ensure all property owners have correct tags

-- Step 1: Migrate all "Owner" tags to "Seller" or "Landlord" based on property offer_type
DO $$
DECLARE
  contact_record RECORD;
  has_sale_property BOOLEAN;
  has_rent_property BOOLEAN;
  current_tags TEXT[];
  new_tags TEXT[];
  other_tags TEXT[];
BEGIN
  -- Process all contacts that have "Owner" tag
  FOR contact_record IN 
    SELECT DISTINCT id FROM leads 
    WHERE 'Owner' = ANY(interest_tags) OR 'owner' = ANY(interest_tags)
  LOOP
    -- Check what types of properties this contact owns
    SELECT EXISTS (
      SELECT 1 FROM properties p
      JOIN contact_properties cp ON cp.property_id = p.id
      WHERE cp.contact_id = contact_record.id 
        AND cp.role = 'owner'
        AND p.offer_type = 'sale'
    ) INTO has_sale_property;
    
    SELECT EXISTS (
      SELECT 1 FROM properties p
      JOIN contact_properties cp ON cp.property_id = p.id
      WHERE cp.contact_id = contact_record.id 
        AND cp.role = 'owner'
        AND p.offer_type = 'rent'
    ) INTO has_rent_property;
    
    -- Get current tags, filter out Owner/owner tags
    SELECT COALESCE(interest_tags, '{}') INTO current_tags
    FROM leads WHERE id = contact_record.id;
    
    SELECT array_agg(tag) INTO other_tags
    FROM unnest(current_tags) AS tag
    WHERE LOWER(tag) NOT IN ('owner', 'landlord', 'seller');
    
    -- Build new tag set
    new_tags := COALESCE(other_tags, '{}');
    
    IF has_sale_property THEN
      new_tags := array_append(new_tags, 'Seller');
    END IF;
    
    IF has_rent_property THEN
      new_tags := array_append(new_tags, 'Landlord');
    END IF;
    
    -- Update the contact
    UPDATE leads 
    SET interest_tags = new_tags
    WHERE id = contact_record.id;
    
    RAISE NOTICE 'Migrated tags for contact %: % -> %', contact_record.id, current_tags, new_tags;
  END LOOP;
  
  RAISE NOTICE 'Owner tag migration completed successfully';
END $$;

-- Step 2: Ensure all property owners have correct tags (even if they didn't have Owner tag)
DO $$
DECLARE
  prop_record RECORD;
BEGIN
  FOR prop_record IN 
    SELECT DISTINCT p.owner_contact_id, p.offer_type
    FROM properties p
    WHERE p.owner_contact_id IS NOT NULL
  LOOP
    -- Call the sync function to ensure tags are correct
    PERFORM sync_owner_tags_from_properties(prop_record.owner_contact_id);
  END LOOP;
  
  RAISE NOTICE 'All property owner tags synced successfully';
END $$;

-- Step 3: Fix missing contact_properties links
INSERT INTO contact_properties (contact_id, property_id, role)
SELECT p.owner_contact_id, p.id, 'owner'
FROM properties p
WHERE p.owner_contact_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contact_properties cp
    WHERE cp.property_id = p.id 
      AND cp.contact_id = p.owner_contact_id
      AND cp.role = 'owner'
  )
ON CONFLICT (contact_id, property_id, role) DO NOTHING;

-- Log the migration results
DO $$
DECLARE
  issue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO issue_count
  FROM check_property_contact_consistency();
  
  IF issue_count = 0 THEN
    RAISE NOTICE 'Data migration successful - no consistency issues found';
  ELSE
    RAISE WARNING 'Found % remaining consistency issues after migration', issue_count;
  END IF;
END $$;
