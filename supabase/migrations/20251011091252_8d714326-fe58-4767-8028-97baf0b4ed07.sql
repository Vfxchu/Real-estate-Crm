-- Temporarily disable the audit trigger
ALTER TABLE contacts DISABLE TRIGGER audit_contacts_write;

-- Step 1: Create contacts from leads that are referenced as property owners
INSERT INTO contacts (id, full_name, phone, email, marketing_source, interest_tags, status_mode, status_effective, created_by)
SELECT 
  l.id,
  l.name,
  l.phone,
  NULLIF(l.email, ''),
  l.lead_source,
  COALESCE(l.interest_tags, ARRAY[]::text[]),
  'auto',
  'active',
  l.agent_id
FROM leads l
WHERE l.id IN (
  SELECT DISTINCT owner_contact_id 
  FROM properties 
  WHERE owner_contact_id IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM contacts c WHERE c.id = l.id
);

-- Re-enable the audit trigger
ALTER TABLE contacts ENABLE TRIGGER audit_contacts_write;

-- Step 2: Drop the old foreign key constraint
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_owner_contact_id_fkey;

-- Step 3: Add new foreign key constraint pointing to contacts
ALTER TABLE properties
ADD CONSTRAINT properties_owner_contact_id_fkey 
FOREIGN KEY (owner_contact_id) 
REFERENCES contacts(id) 
ON DELETE SET NULL;