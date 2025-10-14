-- Add created_by column to properties table to track who created each property
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Set default created_by to agent_id for existing properties (best guess)
UPDATE public.properties 
SET created_by = agent_id 
WHERE created_by IS NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties(created_by);