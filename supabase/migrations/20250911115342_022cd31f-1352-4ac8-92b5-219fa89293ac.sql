-- Fix missing relationship between leads.agent_id and profiles.user_id to enable Supabase FK-based joins
-- 1) Clean up any orphaned agent_id values to avoid FK violations
UPDATE public.leads l
SET agent_id = NULL
WHERE agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = l.agent_id
  );

-- 2) Add the foreign key with the exact name expected by app code: leads_agent_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM   pg_constraint 
    WHERE  conname = 'leads_agent_id_fkey' 
    AND    conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_agent_id_fkey
      FOREIGN KEY (agent_id)
      REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;