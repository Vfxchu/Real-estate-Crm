import { supabase } from '@/integrations/supabase/client';

export interface SendLeadNotificationParams {
  agentId: string;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  notificationType: 'assignment' | 'reassignment' | 'update';
}

/**
 * Send notification when a lead is assigned to an agent
 */
export async function sendLeadNotification(params: SendLeadNotificationParams) {
  try {
    console.log('[NOTIFICATION] Sending notification:', params);

    const { data, error } = await supabase.functions.invoke('send-lead-notification', {
      body: params,
    });

    if (error) {
      console.error('[NOTIFICATION] Error sending notification:', error);
      throw error;
    }

    console.log('[NOTIFICATION] Notification sent successfully:', data);
    return { data, error: null };
  } catch (error: any) {
    console.error('[NOTIFICATION] Failed to send notification:', error);
    return { data: null, error };
  }
}

/**
 * Create in-app notification directly (fallback if edge function fails)
 */
export async function createInAppNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  priority?: 'low' | 'medium' | 'high';
  leadId?: string;
  propertyId?: string;
  dealId?: string;
}) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      priority: params.priority || 'medium',
      lead_id: params.leadId,
      property_id: params.propertyId,
      deal_id: params.dealId,
    });

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('[NOTIFICATION] Failed to create in-app notification:', error);
    return { error };
  }
}
