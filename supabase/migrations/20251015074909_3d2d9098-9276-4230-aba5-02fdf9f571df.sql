-- Drop the existing foreign key constraint
ALTER TABLE public.property_files
DROP CONSTRAINT IF EXISTS property_files_property_id_fkey;

-- Recreate the foreign key with CASCADE delete
ALTER TABLE public.property_files
ADD CONSTRAINT property_files_property_id_fkey
FOREIGN KEY (property_id)
REFERENCES public.properties(id)
ON DELETE CASCADE;