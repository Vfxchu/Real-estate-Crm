-- Create deals table for sales pipeline/opportunities
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prospecting' CHECK (status IN ('prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  value NUMERIC,
  currency TEXT DEFAULT 'USD',
  close_date DATE,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  notes TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deals
CREATE POLICY "Agents can view their own deals"
ON public.deals
FOR SELECT
USING (agent_id = auth.uid() OR get_current_user_role() = 'admin');

CREATE POLICY "Agents can create deals for their contacts"
ON public.deals
FOR INSERT
WITH CHECK (
  agent_id = auth.uid() AND
  contact_id IN (
    SELECT id FROM public.leads 
    WHERE agent_id = auth.uid()
  )
  OR get_current_user_role() = 'admin'
);

CREATE POLICY "Agents can update their own deals"
ON public.deals
FOR UPDATE
USING (agent_id = auth.uid() OR get_current_user_role() = 'admin');

CREATE POLICY "Agents can delete their own deals"
ON public.deals
FOR DELETE
USING (agent_id = auth.uid() OR get_current_user_role() = 'admin');

-- Add updated_at trigger
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update transactions table to include agent_id and property_id for better linking
ALTER TABLE public.transactions 
ADD COLUMN agent_id UUID REFERENCES auth.users(id),
ADD COLUMN property_id UUID REFERENCES public.properties(id),
ADD COLUMN deal_id UUID REFERENCES public.deals(id);

-- Update existing transactions to have agent_id from their lead's agent
UPDATE public.transactions 
SET agent_id = (
  SELECT agent_id 
  FROM public.leads 
  WHERE leads.id = transactions.lead_id
);

-- Add indexes for better performance
CREATE INDEX idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX idx_deals_agent_id ON public.deals(agent_id);
CREATE INDEX idx_deals_property_id ON public.deals(property_id);
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_transactions_agent_id ON public.transactions(agent_id);
CREATE INDEX idx_transactions_deal_id ON public.transactions(deal_id);