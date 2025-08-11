-- Add contacts-specific columns to existing leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_status TEXT
    CHECK (contact_status IN ('lead','active_client','past_client'))
    DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS merged_into_id UUID NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS leads_contact_status_idx ON public.leads (contact_status);
CREATE INDEX IF NOT EXISTS leads_tags_gin_idx ON public.leads USING GIN (tags);
CREATE INDEX IF NOT EXISTS leads_merged_into_id_idx ON public.leads (merged_into_id);