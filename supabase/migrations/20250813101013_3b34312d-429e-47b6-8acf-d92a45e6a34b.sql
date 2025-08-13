-- Fix the create_property_with_files function to properly handle JSONB images array
CREATE OR REPLACE FUNCTION public.create_property_with_files(property_data jsonb, files_data jsonb[] DEFAULT '{}'::jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  new_property_id uuid;
  property_record jsonb;
  file_record jsonb;
  result jsonb;
  current_user_id uuid;
begin
  -- Get current user ID
  select auth.uid() into current_user_id;
  
  -- Log the attempt
  raise notice 'Creating property for user: %', current_user_id;
  raise notice 'Property data: %', property_data;

  -- Insert property with explicit agent_id and proper images handling
  insert into public.properties (
    title, segment, subtype, property_type, address, city, state, zip_code,
    unit_number, bedrooms, bathrooms, area_sqft, status, offer_type,
    price, description, permit_number, owner_contact_id, agent_id,
    location_place_id, location_lat, location_lng, featured, images
  ) 
  values (
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
    coalesce(property_data->>'status', 'available'),
    property_data->>'offer_type',
    (property_data->>'price')::numeric,
    property_data->>'description',
    property_data->>'permit_number',
    (property_data->>'owner_contact_id')::uuid,
    coalesce((property_data->>'agent_id')::uuid, current_user_id),
    property_data->>'location_place_id',
    (property_data->>'location_lat')::numeric,
    (property_data->>'location_lng')::numeric,
    coalesce((property_data->>'featured')::boolean, false),
    case 
      when property_data ? 'images'
      then array(select jsonb_array_elements_text(property_data->'images'))
      else null
    end
  )
  returning id into new_property_id;

  raise notice 'Property created with ID: %', new_property_id;

  -- Insert property files
  if array_length(files_data, 1) > 0 then
    for i in 1..array_length(files_data, 1) loop
      file_record := files_data[i];
      
      insert into public.property_files (
        property_id, type, path, name, size
      ) values (
        new_property_id,
        file_record->>'type',
        file_record->>'path',
        file_record->>'name',
        (file_record->>'size')::bigint
      );
      
      -- If it's a document and owner_contact_id exists, sync to contact_files
      if (file_record->>'type' = 'document') and (property_data->>'owner_contact_id' is not null) then
        insert into public.contact_files (
          contact_id, source, property_id, path, name, type
        ) values (
          (property_data->>'owner_contact_id')::uuid,
          'property',
          new_property_id,
          file_record->>'path',
          file_record->>'name',
          'document'
        );
      end if;
    end loop;
  end if;

  -- Return the created property with files
  select jsonb_build_object(
    'property_id', new_property_id,
    'success', true
  ) into result;
  
  return result;
end;
$function$