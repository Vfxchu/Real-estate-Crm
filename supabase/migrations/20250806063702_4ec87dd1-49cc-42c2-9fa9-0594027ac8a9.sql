-- First, create the auto-assignment function for leads
CREATE OR REPLACE FUNCTION public.get_least_busy_agent()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    agent_id uuid;
BEGIN
    -- Find agent with fewest active leads (excluding won/lost)
    SELECT p.user_id INTO agent_id
    FROM public.profiles p
    LEFT JOIN public.leads l ON p.user_id = l.agent_id 
        AND l.status NOT IN ('won', 'lost')
    WHERE p.role = 'agent' AND p.status = 'active'
    GROUP BY p.user_id
    ORDER BY COUNT(l.id) ASC, p.created_at ASC
    LIMIT 1;
    
    RETURN agent_id;
END;
$$;

-- Create function to auto-assign leads
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only auto-assign if no agent is specified and user creating is admin
    IF NEW.agent_id IS NULL THEN
        -- Check if creator is admin
        IF (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' THEN
            NEW.agent_id := public.get_least_busy_agent();
        ELSE
            -- If agent creates lead, assign to themselves
            NEW.agent_id := auth.uid();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_lead ON public.leads;
CREATE TRIGGER trigger_auto_assign_lead
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_lead();

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for property images
DO $$ 
BEGIN
    -- Allow authenticated users to upload images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Authenticated users can upload property images'
    ) THEN
        CREATE POLICY "Authenticated users can upload property images"
        ON storage.objects
        FOR INSERT
        WITH CHECK (
            bucket_id = 'property-images' 
            AND auth.uid() IS NOT NULL
        );
    END IF;

    -- Allow public access to view images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Public access to property images'
    ) THEN
        CREATE POLICY "Public access to property images"
        ON storage.objects
        FOR SELECT
        USING (bucket_id = 'property-images');
    END IF;

    -- Allow users to update their own property images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can update their property images'
    ) THEN
        CREATE POLICY "Users can update their property images"
        ON storage.objects
        FOR UPDATE
        USING (
            bucket_id = 'property-images' 
            AND (
                -- Admin can update any
                (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
                OR
                -- Agent can update their own properties' images
                (storage.foldername(name))[1] IN (
                    SELECT id::text FROM public.properties 
                    WHERE agent_id = auth.uid()
                )
            )
        );
    END IF;

    -- Allow users to delete their own property images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can delete their property images'
    ) THEN
        CREATE POLICY "Users can delete their property images"
        ON storage.objects
        FOR DELETE
        USING (
            bucket_id = 'property-images' 
            AND (
                -- Admin can delete any
                (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
                OR
                -- Agent can delete their own properties' images
                (storage.foldername(name))[1] IN (
                    SELECT id::text FROM public.properties 
                    WHERE agent_id = auth.uid()
                )
            )
        );
    END IF;
END $$;

-- Update RLS policies for comprehensive security

-- Enhanced leads policies
DROP POLICY IF EXISTS "Agents can delete assigned leads" ON public.leads;
CREATE POLICY "Agents can delete assigned leads"
ON public.leads
FOR DELETE
USING (
    agent_id = auth.uid() 
    OR 
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Enhanced properties policies  
DROP POLICY IF EXISTS "Agents can delete their properties" ON public.properties;
CREATE POLICY "Agents can delete their properties"
ON public.properties
FOR DELETE
USING (
    agent_id = auth.uid() 
    OR 
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Update profiles policy to allow admins to view all profiles
DROP POLICY IF EXISTS "View profiles based on role" ON public.profiles;
CREATE POLICY "View profiles based on role"
ON public.profiles
FOR SELECT
USING (
    user_id = auth.uid()
    OR
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);