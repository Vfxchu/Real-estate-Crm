-- Phase 3: Database Consistency Checker
-- This function checks for data integrity issues between properties, contacts, and tags

CREATE OR REPLACE FUNCTION check_property_contact_consistency()
RETURNS TABLE(
  issue_type text,
  property_id uuid,
  property_title text,
  owner_contact_id uuid,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Properties with invalid owner_contact_id (doesn't exist in leads or contacts)
  RETURN QUERY
  SELECT 
    'invalid_owner'::text,
    p.id,
    p.title,
    p.owner_contact_id,
    'Property has owner_contact_id that does not exist in leads or contacts'::text
  FROM properties p
  WHERE p.owner_contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM leads WHERE id = p.owner_contact_id)
    AND NOT EXISTS (SELECT 1 FROM contacts WHERE id = p.owner_contact_id);

  -- Properties missing contact_properties link
  RETURN QUERY
  SELECT 
    'missing_link'::text,
    p.id,
    p.title,
    p.owner_contact_id,
    'Property has owner but no contact_properties record'::text
  FROM properties p
  WHERE p.owner_contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contact_properties cp 
      WHERE cp.property_id = p.id 
        AND cp.contact_id = p.owner_contact_id
        AND cp.role = 'owner'
    );

  -- Contacts with sale properties but missing 'Seller' tag
  RETURN QUERY
  SELECT 
    'missing_seller_tag'::text,
    p.id,
    p.title,
    p.owner_contact_id,
    'Owner contact missing Seller tag for sale property'::text
  FROM properties p
  JOIN leads l ON l.id = p.owner_contact_id
  WHERE p.owner_contact_id IS NOT NULL
    AND p.offer_type = 'sale'
    AND NOT ('Seller' = ANY(l.interest_tags))
    AND NOT ('seller' = ANY(l.interest_tags));

  -- Contacts with rent properties but missing 'Landlord' tag
  RETURN QUERY
  SELECT 
    'missing_landlord_tag'::text,
    p.id,
    p.title,
    p.owner_contact_id,
    'Owner contact missing Landlord tag for rent property'::text
  FROM properties p
  JOIN leads l ON l.id = p.owner_contact_id
  WHERE p.owner_contact_id IS NOT NULL
    AND p.offer_type = 'rent'
    AND NOT ('Landlord' = ANY(l.interest_tags))
    AND NOT ('landlord' = ANY(l.interest_tags));

  -- Contacts with outdated 'Owner' tags (should be 'Seller' or 'Landlord')
  RETURN QUERY
  SELECT 
    'outdated_owner_tag'::text,
    p.id,
    p.title,
    p.owner_contact_id,
    'Contact has outdated Owner tag - should be Seller or Landlord'::text
  FROM properties p
  JOIN leads l ON l.id = p.owner_contact_id
  WHERE p.owner_contact_id IS NOT NULL
    AND ('Owner' = ANY(l.interest_tags) OR 'owner' = ANY(l.interest_tags));
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_property_contact_consistency() TO authenticated;

COMMENT ON FUNCTION check_property_contact_consistency() IS 
'Checks for data integrity issues between properties, contacts, and ownership tags. 
Run periodically to identify and fix inconsistencies in property-contact relationships.';
