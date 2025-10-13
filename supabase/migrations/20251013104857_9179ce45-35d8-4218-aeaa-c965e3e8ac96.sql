-- Fix the audit function to set search_path for security
CREATE OR REPLACE FUNCTION audit_write_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only insert audit record if user_id is available (not a system operation)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO access_audit (user_id, action, entity_type, entity_id)
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;