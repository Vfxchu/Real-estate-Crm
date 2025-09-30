-- Clean up duplicate tasks for the same lead, keeping only the most recent
WITH duplicates AS (
  SELECT 
    id,
    lead_id,
    title,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY lead_id, title, type 
      ORDER BY created_at DESC
    ) as rn
  FROM tasks
  WHERE lead_id IS NOT NULL
    AND status = 'Open'
)
DELETE FROM tasks
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up any orphaned tasks for leads in terminal status
DELETE FROM tasks
WHERE lead_id IN (
  SELECT id FROM leads 
  WHERE status IN ('won', 'lost') 
     OR (custom_fields->>'invalid')::boolean = true
)
AND status = 'Open';

-- Create a function to identify data inconsistencies
CREATE OR REPLACE FUNCTION public.check_task_consistency()
RETURNS TABLE(
  issue_type text,
  lead_id uuid,
  lead_name text,
  lead_status text,
  task_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Find leads in terminal status with open tasks
  SELECT 
    'terminal_status_with_open_tasks' as issue_type,
    l.id as lead_id,
    l.name as lead_name,
    l.status as lead_status,
    COUNT(t.id) as task_count
  FROM leads l
  INNER JOIN tasks t ON t.lead_id = l.id
  WHERE (l.status IN ('won', 'lost') OR (l.custom_fields->>'invalid')::boolean = true)
    AND t.status = 'Open'
  GROUP BY l.id, l.name, l.status
  
  UNION ALL
  
  -- Find leads with duplicate open tasks
  SELECT 
    'duplicate_open_tasks' as issue_type,
    l.id as lead_id,
    l.name as lead_name,
    l.status as lead_status,
    COUNT(t.id) as task_count
  FROM leads l
  INNER JOIN tasks t ON t.lead_id = l.id
  WHERE t.status = 'Open'
  GROUP BY l.id, l.name, l.status, t.title, t.type
  HAVING COUNT(t.id) > 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_task_consistency() TO authenticated;