-- Fix 1: Harden the create_property_with_files function
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
  SELECT public.get_current_user_role() = 'admin' INTO is_admin;
  
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

-- Fix 2: Create storage policies for secure file access
-- Property Images bucket policies
CREATE POLICY "Admin can manage all property images" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'property-images' AND public.get_current_user_role() = 'admin');

CREATE POLICY "Agent can manage own property images" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'property-images' 
  AND auth.uid() IN (
    SELECT agent_id FROM properties 
    WHERE id::text = split_part(name, '/', 1)
  )
);

-- Property Documents bucket policies
CREATE POLICY "Admin can manage all property docs" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'property-docs' AND public.get_current_user_role() = 'admin');

CREATE POLICY "Agent can manage own property docs" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'property-docs' 
  AND auth.uid() IN (
    SELECT agent_id FROM properties 
    WHERE id::text = split_part(name, '/', 1)
  )
);

-- Documents bucket policies
CREATE POLICY "Admin can manage all documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'documents' AND public.get_current_user_role() = 'admin');

CREATE POLICY "Agent can manage own documents" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Property Layouts bucket policies
CREATE POLICY "Admin can manage all property layouts" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'property-layouts' AND public.get_current_user_role() = 'admin');

CREATE POLICY "Agent can manage own property layouts" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'property-layouts' 
  AND auth.uid() IN (
    SELECT agent_id FROM properties 
    WHERE id::text = split_part(name, '/', 1)
  )
);