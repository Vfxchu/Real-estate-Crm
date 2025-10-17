-- Add foreign key constraints to link communications with profiles
ALTER TABLE communications 
  ADD CONSTRAINT communications_agent_id_fkey 
  FOREIGN KEY (agent_id) 
  REFERENCES profiles(user_id) 
  ON DELETE CASCADE;

ALTER TABLE communications 
  ADD CONSTRAINT communications_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(user_id) 
  ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_communications_agent_id 
  ON communications(agent_id);

CREATE INDEX IF NOT EXISTS idx_communications_created_by 
  ON communications(created_by);