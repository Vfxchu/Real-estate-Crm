import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_at: string;
  status: string;
  type: string;
  origin: string;
  lead_id?: string;
  assigned_to: string;
  calendar_event_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useTasks(leadId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('due_at', { ascending: true });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else {
        query = query.eq('assigned_to', (await supabase.auth.getUser()).data.user?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive"
        });
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error in fetchTasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      if (status.toLowerCase() === 'completed') {
        // Use the auto-followup completion function
        const { data, error } = await supabase.rpc('complete_task_with_auto_followup', {
          p_task_id: taskId
        });

        if (error) throw error;

        const result = (data as any)?.[0];
        if (result) {
          const toastMessage = result.next_task_id 
            ? `Task completed • Next follow-up auto-created for ${result.lead_stage} stage`
            : `Task completed`;
          
          toast({
            title: "Task Completed",
            description: toastMessage,
            variant: "default"
          });
        }
      } else {
        // Regular status update for non-completion
        const { error } = await supabase
          .from('tasks')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', taskId);

        if (error) throw error;

        toast({
          title: "Task Updated", 
          description: `Task marked as ${status.toLowerCase()}`,
          variant: "default"
        });
      }

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status } : task
      ));

    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const createManualFollowUp = async (leadId: string) => {
    try {
      const { data, error } = await supabase.rpc('ensure_manual_followup', {
        p_lead_id: leadId
      });

      if (error) {
        // Handle terminal status errors with clear messages
        if (error.message.includes('workflow ended')) {
          toast({
            title: "Cannot Create Task",
            description: error.message,
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Follow-up Created",
        description: "Manual follow-up task created (+1h)",
        variant: "default"
      });

      await fetchTasks();
      return data;
    } catch (error: any) {
      console.error('Error creating manual follow-up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create follow-up",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: leadId ? `lead_id=eq.${leadId}` : undefined
        },
        (payload) => {
          console.log('Task realtime update:', payload);
          fetchTasks(); // Refetch to get updated data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  // Subscribe to auto task creation notifications
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel('auto-task-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          const newTask = payload.new as Task;
          if (newTask.origin === 'auto_followup' && newTask.status === 'Open') {
            const dueDate = new Date(newTask.due_at);
            // Convert to Dubai time for display
            const dubaiTime = new Date(dueDate.getTime() + (4 * 60 * 60 * 1000));
            
            const isFromCompletion = newTask.created_at && 
              (Date.now() - new Date(newTask.created_at).getTime()) < 5000; // Within 5 seconds
            
            toast({
              title: isFromCompletion ? "Next follow-up auto-created" : "Follow-up task created",
              description: `Due ${dubaiTime.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Asia/Dubai'
              })}`,
              variant: "default"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, toast]);

  return {
    tasks,
    loading,
    fetchTasks,
    updateTaskStatus,
    createManualFollowUp
  };
}