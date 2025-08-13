-- Add new columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS segment text CHECK (segment IN ('residential', 'commercial')),
ADD COLUMN IF NOT EXISTS subtype text,
ADD COLUMN IF NOT EXISTS location_place_id text,
ADD COLUMN IF NOT EXISTS location_lat numeric,
ADD COLUMN IF NOT EXISTS location_lng numeric,
ADD COLUMN IF NOT EXISTS unit_number text,
ADD COLUMN IF NOT EXISTS offer_type text CHECK (offer_type IN ('rent', 'sale')),
ADD COLUMN IF NOT EXISTS permit_number text,
ADD COLUMN IF NOT EXISTS owner_contact_id uuid REFERENCES public.leads(id);

-- Update status column constraint to include new values
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
CHECK (status IN ('available', 'pending', 'sold', 'off_market', 'vacant', 'rented', 'in_development'));

-- Create property_files table for file management
CREATE TABLE IF NOT EXISTS public.property_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'layout', 'document')),
  path text NOT NULL,
  name text NOT NULL,
  size bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create contact_files table for contact document sync
CREATE TABLE IF NOT EXISTS public.contact_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.property_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_files
CREATE POLICY "Property files select" ON public.property_files
FOR SELECT USING (
  (get_current_user_role() = 'admin'::text) OR 
  (property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()))
);

CREATE POLICY "Property files insert" ON public.property_files
FOR INSERT WITH CHECK (
  (get_current_user_role() = 'admin'::text) OR 
  (property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()))
);

CREATE POLICY "Property files update" ON public.property_files
FOR UPDATE USING (
  (get_current_user_role() = 'admin'::text) OR 
  (property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()))
);

CREATE POLICY "Property files delete" ON public.property_files
FOR DELETE USING (
  (get_current_user_role() = 'admin'::text) OR 
  (property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid()))
);

-- RLS policies for contact_files
CREATE POLICY "Contact files select" ON public.contact_files
FOR SELECT USING (
  (get_current_user_role() = 'admin'::text) OR 
  (contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()))
);

CREATE POLICY "Contact files insert" ON public.contact_files
FOR INSERT WITH CHECK (
  (get_current_user_role() = 'admin'::text) OR 
  (contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()))
);

CREATE POLICY "Contact files update" ON public.contact_files
FOR UPDATE USING (
  (get_current_user_role() = 'admin'::text) OR 
  (contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()))
);

CREATE POLICY "Contact files delete" ON public.contact_files
FOR DELETE USING (
  (get_current_user_role() = 'admin'::text) OR 
  (contact_id IN (SELECT id FROM public.leads WHERE agent_id = auth.uid()))
);

-- Create storage buckets for property files
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('property-layouts', 'property-layouts', false),
  ('property-docs', 'property-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property-layouts bucket
CREATE POLICY "Property layouts select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-layouts' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property layouts insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-layouts' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property layouts update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-layouts' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property layouts delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-layouts' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Storage policies for property-docs bucket
CREATE POLICY "Property docs select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-docs' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property docs insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-docs' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property docs update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-docs' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property docs delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-docs' AND (
    (SELECT get_current_user_role()) = 'admin' OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Create function for batch property creation with files
CREATE OR REPLACE FUNCTION public.create_property_with_files(
  property_data jsonb,
  files_data jsonb[] DEFAULT '{}'
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_property_id uuid;
  property_record jsonb;
  file_record jsonb;
  result jsonb;
BEGIN
  -- Insert property
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
    property_data->>'status',
    property_data->>'offer_type',
    (property_data->>'price')::numeric,
    property_data->>'description',
    property_data->>'permit_number',
    (property_data->>'owner_contact_id')::uuid,
    (property_data->>'agent_id')::uuid,
    property_data->>'location_place_id',
    (property_data->>'location_lat')::numeric,
    (property_data->>'location_lng')::numeric,
    (property_data->>'featured')::boolean,
    CASE 
      WHEN property_data->'images' IS NOT NULL 
      THEN (property_data->'images')::text[]
      ELSE NULL 
    END
  )
  RETURNING id INTO new_property_id;

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
$$;