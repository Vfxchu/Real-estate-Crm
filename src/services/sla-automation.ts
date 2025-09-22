import { supabase } from '@/integrations/supabase/client';

/**
 * Set up automated SLA monitoring by calling the edge function periodically
 * This should be called once to register the automation
 */
export async function setupSlaAutomation() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create an automation workflow for SLA monitoring
    const { data, error } = await supabase
      .from('automation_workflows')
      .insert({
        name: 'SLA Monitor',
        description: 'Automatically reassign overdue leads every 5 minutes',
        trigger_type: 'scheduled',
        trigger_conditions: {
          schedule: '*/5 * * * *', // Every 5 minutes
          enabled: true
        },
        webhook_url: `https://lnszidczioariaebsquo.supabase.co/functions/v1/sla-monitor`,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (error && !error.message.includes('duplicate key')) {
      throw error;
    }

    console.log('SLA automation setup successfully');
    return data;
  } catch (error) {
    console.error('Error setting up SLA automation:', error);
    throw error;
  }
}

/**
 * Manually trigger SLA sweep for testing
 */
export async function triggerSlaSweep() {
  try {
    const response = await fetch(
      `https://lnszidczioariaebsquo.supabase.co/functions/v1/sla-monitor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to trigger SLA sweep');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error triggering SLA sweep:', error);
    throw error;
  }
}