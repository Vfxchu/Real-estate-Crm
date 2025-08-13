-- Fix the create_property_with_files function with proper search path
DROP FUNCTION IF EXISTS public.create_property_with_files(jsonb, jsonb[]);

CREATE OR REPLACE FUNCTION public.create_property_with_files(property_data jsonb, files_data jsonb[] DEFAULT '{}'::jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_property_id uuid;
  property_record jsonb;
  file_record jsonb;
  result jsonb;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- Log the attempt
  RAISE NOTICE 'Creating property for user: %', current_user_id;
  RAISE NOTICE 'Property data: %', property_data;

  -- Insert property with explicit agent_id
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
    COALESCE((property_data->>'agent_id')::uuid, current_user_id),
    property_data->>'location_place_id',
    (property_data->>'location_lat')::numeric,
    (property_data->>'location_lng')::numeric,
    COALESCE((property_data->>'featured')::boolean, false),
    CASE 
      WHEN property_data->'images' IS NOT NULL 
      THEN (property_data->'images')::text[]
      ELSE NULL 
    END
  )
  RETURNING id INTO new_property_id;

  RAISE NOTICE 'Property created with ID: %', new_property_id;

  -- Insert property files
  IF array_length(files_data, 1) > 0 THEN
    FOR i IN 1..array_length(files_data, 1) LOOP
      file_record := files_data[i];
      
      INSERT INTO public.property_files (
        property_id, type, path, name, size
      ) VALUES (
        new_property_id,
        file_record->>'type',
        file_record->>'path',
        file_record->>'name',
        (file_record->>'size')::bigint
      );
      
      -- If it's a document and owner_contact_id exists, sync to contact_files
      IF (file_record->>'type' = 'document') AND (property_data->>'owner_contact_id' IS NOT NULL) THEN
        INSERT INTO public.contact_files (
          contact_id, source, property_id, path, name, type
        ) VALUES (
          (property_data->>'owner_contact_id')::uuid,
          'property',
          new_property_id,
          file_record->>'path',
          file_record->>'name',
          'document'
        );
      END IF;
    END LOOP;
  END IF;

  -- Return the created property with files
  SELECT jsonb_build_object(
    'property_id', new_property_id,
    'success', true
  ) INTO result;
  
  RETURN result;
END;
$function$;