-- Create communications table for message persistence
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'call', 'sms', 'meeting')),
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their communications"
  ON public.communications FOR SELECT
  USING (
    agent_id = auth.uid() OR 
    created_by = auth.uid() OR
    is_admin()
  );

CREATE POLICY "Users can create communications"
  ON public.communications FOR INSERT
  WITH CHECK (
    agent_id = auth.uid() OR 
    created_by = auth.uid() OR
    is_admin()
  );

CREATE POLICY "Users can update their communications"
  ON public.communications FOR UPDATE
  USING (
    agent_id = auth.uid() OR 
    created_by = auth.uid() OR
    is_admin()
  );

CREATE POLICY "Admins can delete communications"
  ON public.communications FOR DELETE
  USING (is_admin());

-- Indexes for performance
CREATE INDEX idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX idx_communications_contact_id ON public.communications(contact_id);
CREATE INDEX idx_communications_agent_id ON public.communications(agent_id);
CREATE INDEX idx_communications_created_at ON public.communications(created_at DESC);
CREATE INDEX idx_communications_type ON public.communications(type);

-- Trigger for updated_at
CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON public.communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();