import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface TaskCreationData {
  leadId: string;
  title: string;
  description?: string;
  dueAt: Date;
  eventType: string;
  businessOutcome?: string;
}

/**
 * Create a new follow-up task with calendar event sync
 */
export async function createFollowUpTask(data: TaskCreationData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const endTime = new Date(data.dueAt.getTime() + 60 * 60 * 1000); // 1 hour duration

  try {
    // Create calendar event (task)
    const { data: taskEvent, error: taskError } = await supabase
      .from('calendar_events')
      .insert({
        title: data.title,
        event_type: data.eventType,
        start_date: data.dueAt.toISOString(),
        end_date: endTime.toISOString(),
        lead_id: data.leadId,
        agent_id: user.id,
        created_by: user.id,
        description: data.description || '',
        status: 'scheduled',
        reminder_minutes: 15,
        reminder_offset_min: 15
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Log activity
    await supabase.from('activities').insert({
      type: 'task_created',
      description: `${data.businessOutcome ? `[${data.businessOutcome}] ` : ''}Created task: ${data.title} - Due: ${format(data.dueAt, 'PPp')}`,
      lead_id: data.leadId,
      created_by: user.id
    });

    return taskEvent;
  } catch (error) {
    console.error('Error creating follow-up task:', error);
    throw error;
  }
}

/**
 * Auto-create initial follow-up task for new leads
 */
export async function createInitialFollowUpTask(leadId: string, leadName: string, agentId: string) {
  const followUpTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  
  return createFollowUpTask({
    leadId,
    title: `Follow up with ${leadName}`,
    description: `Initial follow-up call for new lead: ${leadName}`,
    dueAt: followUpTime,
    eventType: 'follow_up'
  });
}

/**
 * Mark task as completed with auto-next-task creation
 */
export async function completeTask(taskId: string, leadId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Use the new auto-followup completion function
    const { data, error } = await supabase.rpc('complete_task_with_auto_followup', {
      p_task_id: taskId
    });

    if (error) throw error;

    const result = data?.[0];
    if (result) {
      console.log('Task completion result:', result);
      return {
        completed: true,
        nextTaskCreated: !!result.next_task_id,
        leadStage: result.lead_stage,
        nextTaskId: result.next_task_id
      };
    }

    return { completed: true, nextTaskCreated: false };
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}

/**
 * Reschedule a task to a new date/time
 */
export async function rescheduleTask(taskId: string, newDateTime: Date) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const endTime = new Date(newDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  try {
    // Get current task
    const { data: task } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task) throw new Error('Task not found');

    // Update task timing
    const { error } = await supabase
      .from('calendar_events')
      .update({
        start_date: newDateTime.toISOString(),
        end_date: endTime.toISOString()
      })
      .eq('id', taskId);

    if (error) throw error;

    // For meeting events, reset the meeting_scheduled outcome to allow rescheduling
    if (task.event_type === 'meeting' && task.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('custom_fields')
        .eq('id', task.lead_id)
        .single();

      const customFields = (lead?.custom_fields as any) || {};
      const outcomes = customFields.outcomes_selected || [];
      const updatedOutcomes = outcomes.filter((o: string) => o !== 'meeting_scheduled');

      await supabase
        .from('leads')
        .update({
          custom_fields: {
            ...customFields,
            outcomes_selected: updatedOutcomes
          }
        })
        .eq('id', task.lead_id);
    }

    // Log rescheduling activity
    await supabase.from('activities').insert({
      type: 'task_rescheduled',
      description: `Task "${task.title}" rescheduled to ${format(newDateTime, 'PPp')}`,
      lead_id: task.lead_id,
      created_by: user.id
    });

    return task;
  } catch (error) {
    console.error('Error rescheduling task:', error);
    throw error;
  }
}