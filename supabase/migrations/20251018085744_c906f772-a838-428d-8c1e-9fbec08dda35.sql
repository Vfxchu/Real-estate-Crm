-- Update sync_owner_tags_from_properties to use 'Seller' instead of 'Owner'
CREATE OR REPLACE FUNCTION public.sync_owner_tags_from_properties(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Filter out existing Seller/Landlord/Owner tags (case-insensitive), keep all other tags
  SELECT array_agg(tag) INTO v_other_tags
  FROM unnest(v_current_tags) AS tag
  WHERE LOWER(tag) NOT IN ('owner', 'landlord', 'seller');
  
  -- Build new tag set
  v_new_tags := COALESCE(v_other_tags, '{}');
  
  IF v_has_sale THEN
    v_new_tags := array_append(v_new_tags, 'Seller');
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
$function$;