-- Fix 1: Add missing validation triggers for leads
DROP TRIGGER IF EXISTS sanitize_lead_input_trigger ON public.leads;
CREATE TRIGGER sanitize_lead_input_trigger
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_lead_input();

DROP TRIGGER IF EXISTS leads_sync_contact_status_trigger ON public.leads;
CREATE TRIGGER leads_sync_contact_status_trigger
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.leads_sync_contact_status();

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Fix 2: Add missing validation triggers for other tables
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Fix 3: Add file validation triggers
DROP TRIGGER IF EXISTS validate_property_file_upload ON public.property_files;
CREATE TRIGGER validate_property_file_upload
    BEFORE INSERT OR UPDATE ON public.property_files
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_file_upload();

DROP TRIGGER IF EXISTS validate_contact_file_upload ON public.contact_files;
CREATE TRIGGER validate_contact_file_upload
    BEFORE INSERT OR UPDATE ON public.contact_files
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_file_upload();

-- Fix 4: Protect profiles.role from unauthorized changes
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow role changes by admins
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF public.get_user_role_secure(auth.uid()) != 'admin' THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to protect profile role changes
DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Fix 5: Add role assignment validation trigger
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER validate_role_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_role_assignment();

-- Fix 6: Add role change audit trigger
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_role_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_role_changes();

-- Fix 7: Harden the create_property_with_files function
CREATE OR REPLACE FUNCTION public.create_property_with_files(property_data jsonb, files_data jsonb[] DEFAULT '{}'::jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_property_id uuid;
  file_record jsonb;
  result jsonb;
  current_user_id uuid;
  is_admin boolean;
  specified_agent_id uuid;
BEGIN
  -- Get current user ID and reject anonymous calls
  SELECT auth.uid() INTO current_user_id;
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user is admin
  SELECT public.get_user_role_secure(auth.uid()) = 'admin' INTO is_admin;
  
  -- Get specified agent_id from property_data
  specified_agent_id := (property_data->>'agent_id')::uuid;
  
  -- Security check: only admins can assign properties to other agents
  IF specified_agent_id IS NOT NULL AND specified_agent_id != current_user_id AND NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can assign properties to other agents';
  END IF;
  
  -- Set agent_id: use specified if admin, otherwise current user
  IF specified_agent_id IS NULL OR NOT is_admin THEN
    specified_agent_id := current_user_id;
  END IF;
  
  -- Insert property with validated agent_id
  INSERT INTO public.properties (
    title, segment, subtype, property_type, address, city, state, zip_code,
    unit_number, bedrooms, bathrooms, area_sqft, status, offer_type,
    price, description, permit_number, owner_contact_id, agent_id,
    location_place_id, location_lat, location_lng, featured, images
  ) 
  VALUES (
    property_data->>'title',
    property_data->>'segment',
    property_data->>'subtype',
    property_data->>'property_type',
    property_data->>'address',
    property_data->>'city',
    property_data->>'state',
    property_data->>'zip_code',
    property_data->>'unit_number',
    (property_data->>'bedrooms')::integer,
    (property_data->>'bathrooms')::integer,
    (property_data->>'area_sqft')::integer,
    COALESCE(property_data->>'status', 'available'),
    property_data->>'offer_type',
    (property_data->>'price')::numeric,
    property_data->>'description',
    property_data->>'permit_number',
    (property_data->>'owner_contact_id')::uuid,
    specified_agent_id,
    property_data->>'location_place_id',
    (property_data->>'location_lat')::numeric,
    (property_data->>'location_lng')::numeric,
    COALESCE((property_data->>'featured')::boolean, false),
    CASE 
      WHEN property_data->'images' IS NOT NULL 
      THEN array(
        SELECT jsonb_array_elements_text(property_data->'images')
      )
      ELSE NULL 
    END
  )
  RETURNING id INTO new_property_id;

  -- Insert property files with validation
  IF array_length(files_data, 1) > 0 THEN
    FOR i IN 1..array_length(files_data, 1) LOOP
      file_record := files_data[i];
      
      -- Validate file size if provided
      IF (file_record->>'size')::bigint > 10485760 THEN
        RAISE EXCEPTION 'File size exceeds 10MB limit';
      END IF;
      
      INSERT INTO public.property_files (
        property_id, type, path, name, size
      ) VALUES (
        new_property_id,
        file_record->>'type',
        file_record->>'path',
        regexp_replace(file_record->>'name', '[^a-zA-Z0-9._-]', '_', 'g'),
        (file_record->>'size')::bigint
      );
      
      -- Sync document to contact_files if owner_contact_id exists
      IF (file_record->>'type' = 'document') AND (property_data->>'owner_contact_id' IS NOT NULL) THEN
        INSERT INTO public.contact_files (
          contact_id, source, property_id, path, name, type
        ) VALUES (
          (property_data->>'owner_contact_id')::uuid,
          'property',
          new_property_id,
          file_record->>'path',
          regexp_replace(file_record->>'name', '[^a-zA-Z0-9._-]', '_', 'g'),
          'document'
        );
      END IF;
    END LOOP;
  END IF;

  -- Return minimal data
  SELECT jsonb_build_object(
    'property_id', new_property_id,
    'success', true
  ) INTO result;
  
  RETURN result;
END;
$function$;