-- Add missing relationship columns to activities table for better tracking
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id),
ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Add contact_id column to leads table to establish lead-contact relationship  
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Create index for better performance on activity lookups
CREATE INDEX IF NOT EXISTS idx_activities_property_id ON activities(property_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);

-- Update RLS policies for activities to include property and contact relationships
DROP POLICY IF EXISTS "Users can view activities they created" ON activities;
DROP POLICY IF EXISTS "Users can create activities" ON activities;
DROP POLICY IF EXISTS "Users can update activities they created" ON activities;
DROP POLICY IF EXISTS "Users can delete activities they created" ON activities;

CREATE POLICY "Users can view relevant activities" ON activities
FOR SELECT USING (
  created_by = auth.uid() OR
  is_admin() OR
  (lead_id IS NOT NULL AND EXISTS(SELECT 1 FROM leads WHERE id = activities.lead_id AND agent_id = auth.uid())) OR
  (property_id IS NOT NULL AND EXISTS(SELECT 1 FROM properties WHERE id = activities.property_id AND agent_id = auth.uid()))
);

CREATE POLICY "Users can create activities" ON activities
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND (
    (lead_id IS NOT NULL AND EXISTS(SELECT 1 FROM leads WHERE id = activities.lead_id AND agent_id = auth.uid())) OR
    (property_id IS NOT NULL AND EXISTS(SELECT 1 FROM properties WHERE id = activities.property_id AND agent_id = auth.uid())) OR
    is_admin()
  )
);

CREATE POLICY "Users can update their activities" ON activities
FOR UPDATE USING (
  created_by = auth.uid() OR is_admin()
);

CREATE POLICY "Users can delete their activities" ON activities
FOR DELETE USING (
  created_by = auth.uid() OR is_admin()
);