-- Enable real-time for contact_properties table
ALTER TABLE public.contact_properties REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_properties;

-- Add unique constraint to prevent duplicate links
ALTER TABLE public.contact_properties 
ADD CONSTRAINT contact_properties_unique_link UNIQUE (contact_id, property_id, role);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_properties_property_id ON public.contact_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_contact_properties_contact_id ON public.contact_properties(contact_id);