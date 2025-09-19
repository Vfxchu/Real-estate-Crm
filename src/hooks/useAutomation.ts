import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { automationService, AutomationWorkflow, AutomationExecution } from "@/services/automation";
import { useToast } from "@/hooks/use-toast";

export function useWorkflows() {
  return useQuery({
    queryKey: ['automation-workflows'],
    queryFn: () => automationService.getWorkflows(),
  });
}

export function useExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['automation-executions', workflowId],
    queryFn: () => automationService.getExecutions(workflowId),
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (workflow: Omit<AutomationWorkflow, 'id' | 'created_by' | 'created_at' | 'updated_at'>) =>
      automationService.createWorkflow(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast({
        title: "Success",
        description: "Automation workflow created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AutomationWorkflow> }) =>
      automationService.updateWorkflow(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast({
        title: "Success",
        description: "Workflow updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => automationService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workflow",
        variant: "destructive",
      });
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      automationService.toggleWorkflow(id, is_active),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast({
        title: "Success",
        description: `Workflow ${data.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle workflow",
        variant: "destructive",
      });
    },
  });
}

export function useTriggerAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ triggerType, data, workflowId }: { 
      triggerType: string; 
      data: Record<string, any>; 
      workflowId?: string 
    }) => automationService.triggerAutomation(triggerType, data, workflowId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      toast({
        title: "Success",
        description: `Triggered ${result.triggeredCount} automation${result.triggeredCount !== 1 ? 's' : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger automation",
        variant: "destructive",
      });
    },
  });
}

export function useTestWebhook() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ webhookUrl, testData }: { webhookUrl: string; testData?: Record<string, any> }) =>
      automationService.testWebhook(webhookUrl, testData),
    onSuccess: (success) => {
      toast({
        title: success ? "Success" : "Failed",
        description: success ? "Webhook test successful" : "Webhook test failed",
        variant: success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test webhook",
        variant: "destructive",
      });
    },
  });
}