-- Create secure storage buckets for the CRM system
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('property-images', 'property-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('property-layouts', 'property-layouts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']);

-- Create RLS policies for property images bucket
CREATE POLICY "Agents can view related property images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-images' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id::text FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

CREATE POLICY "Agents can upload property images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-images' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Agents can update own property images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-images' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id::text FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

CREATE POLICY "Agents can delete own property images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-images' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id::text FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

-- Create RLS policies for property layouts bucket
CREATE POLICY "Agents can view related property layouts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-layouts' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id::text FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

CREATE POLICY "Agents can upload property layouts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-layouts' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Agents can update own property layouts" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-layouts' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id::text FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

CREATE POLICY "Agents can delete own property layouts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-layouts' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id::text FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

-- Create RLS policies for documents bucket
CREATE POLICY "Users can view related documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM leads WHERE agent_id = auth.uid()
      UNION
      SELECT id FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

CREATE POLICY "Users can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM leads WHERE agent_id = auth.uid()
      UNION
      SELECT id FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

CREATE POLICY "Users can delete own documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM leads WHERE agent_id = auth.uid()
      UNION
      SELECT id FROM properties WHERE agent_id = auth.uid()
    ) OR
    get_current_user_role() = ANY (ARRAY['admin', 'superadmin'])
  )
);

-- Create audit log table for security events
CREATE TABLE public.security_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Audit table policies - only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin', 'superadmin']));

CREATE POLICY "System can create audit logs" 
ON public.security_audit 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create audit function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  );
END;
$$;