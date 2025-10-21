-- Add WordPress sync tracking columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS wp_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS wp_last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wp_sync_error TEXT;

-- Create index for faster sync status queries
CREATE INDEX IF NOT EXISTS idx_properties_wp_sync_status ON properties(wp_sync_status);

-- Create table for portal sync logs
CREATE TABLE IF NOT EXISTS portal_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  portal TEXT NOT NULL CHECK (portal IN ('wordpress', 'property_finder', 'bayut')),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster log queries
CREATE INDEX IF NOT EXISTS idx_portal_sync_logs_property ON portal_sync_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_portal_sync_logs_created_at ON portal_sync_logs(created_at DESC);

-- Enable RLS on portal_sync_logs
ALTER TABLE portal_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view logs for their own properties or if admin
CREATE POLICY portal_sync_logs_select ON portal_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = portal_sync_logs.property_id
        AND (p.agent_id = auth.uid() OR is_admin())
    )
  );

-- RLS policy: System can insert logs
CREATE POLICY portal_sync_logs_insert ON portal_sync_logs
  FOR INSERT
  WITH CHECK (true);