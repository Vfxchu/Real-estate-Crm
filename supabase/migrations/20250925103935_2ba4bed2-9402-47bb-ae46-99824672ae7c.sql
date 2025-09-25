-- Add view column to properties table
ALTER TABLE properties ADD COLUMN view TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.view IS 'Property view type (e.g., Sea View, City View, etc.)';

-- Create storage bucket for property documents if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-docs', 'property-docs', false)
ON CONFLICT (id) DO NOTHING;