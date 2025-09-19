import { supabase } from "@/integrations/supabase/client";

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string | null;
  n8n_workflow_id: string | null;
  webhook_url: string | null;
  trigger_type: string;
  trigger_conditions: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecution {
  id: string;
  workflow_id: string;
  trigger_data: any;
  execution_result: any;
  status: string;
  executed_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export const automationService = {
  // Get all workflows for current user
  async getWorkflows(): Promise<AutomationWorkflow[]> {
    const { data, error } = await supabase
      .from('automation_workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create new workflow
  async createWorkflow(workflow: Omit<AutomationWorkflow, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<AutomationWorkflow> {
    const { data, error } = await supabase
      .from('automation_workflows')
      .insert({
        ...workflow,
        created_by: (await supabase.auth.getUser()).data.user?.id || ''
      })
      .select()
      .single();

    if (error) throw error;
    return data as AutomationWorkflow;
  },

  // Update workflow
  async updateWorkflow(id: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const { data, error } = await supabase
      .from('automation_workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete workflow
  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle workflow active status
  async toggleWorkflow(id: string, is_active: boolean): Promise<AutomationWorkflow> {
    return this.updateWorkflow(id, { is_active });
  },

  // Get executions for a workflow
  async getExecutions(workflowId?: string): Promise<AutomationExecution[]> {
    let query = supabase
      .from('automation_executions')
      .select(`
        *,
        automation_workflows!inner(name, trigger_type)
      `)
      .order('executed_at', { ascending: false })
      .limit(100);

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Trigger automation manually
  async triggerAutomation(triggerType: string, data: Record<string, any>, workflowId?: string): Promise<any> {
    const { data: result, error } = await supabase.functions.invoke('trigger-automation', {
      body: {
        triggerType,
        data,
        workflowId
      }
    });

    if (error) throw error;
    return result;
  },

  // Test webhook URL
  async testWebhook(webhookUrl: string, testData: Record<string, any> = {}): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          ...testData
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }
};