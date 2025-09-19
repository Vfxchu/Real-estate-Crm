-- Create automation workflows table
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  n8n_workflow_id TEXT,
  webhook_url TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('lead_created', 'lead_updated', 'property_created', 'deal_created', 'manual', 'scheduled')),
  trigger_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automation execution logs table
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  execution_result JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending', 'running')),
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for automation_workflows
CREATE POLICY "Users can view their workflows or admin can view all"
ON public.automation_workflows
FOR SELECT
USING (
  created_by = auth.uid() OR 
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Users can create their own workflows"
ON public.automation_workflows
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their workflows or admin can update all"
ON public.automation_workflows
FOR UPDATE
USING (
  created_by = auth.uid() OR 
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "Users can delete their workflows or admin can delete all"
ON public.automation_workflows
FOR DELETE
USING (
  created_by = auth.uid() OR 
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

-- Create RLS policies for automation_executions
CREATE POLICY "Users can view executions of their workflows or admin can view all"
ON public.automation_executions
FOR SELECT
USING (
  workflow_id IN (
    SELECT id FROM public.automation_workflows 
    WHERE created_by = auth.uid()
  ) OR 
  get_current_user_role() = ANY(ARRAY['admin', 'superadmin'])
);

CREATE POLICY "System can create execution logs"
ON public.automation_executions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update execution logs"
ON public.automation_executions
FOR UPDATE
USING (true);

-- Add foreign key constraint
ALTER TABLE public.automation_executions 
ADD CONSTRAINT automation_executions_workflow_id_fkey 
FOREIGN KEY (workflow_id) REFERENCES public.automation_workflows(id) ON DELETE CASCADE;

-- Create updated_at trigger for automation_workflows
CREATE TRIGGER update_automation_workflows_updated_at
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_automation_workflows_created_by ON public.automation_workflows(created_by);
CREATE INDEX idx_automation_workflows_trigger_type ON public.automation_workflows(trigger_type);
CREATE INDEX idx_automation_workflows_is_active ON public.automation_workflows(is_active);
CREATE INDEX idx_automation_executions_workflow_id ON public.automation_executions(workflow_id);
CREATE INDEX idx_automation_executions_status ON public.automation_executions(status);
CREATE INDEX idx_automation_executions_executed_at ON public.automation_executions(executed_at);