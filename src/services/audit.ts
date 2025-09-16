import { supabase } from "@/integrations/supabase/client";

export interface AuditEvent {
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

/**
 * Log a security event for audit purposes
 */
export async function logSecurityEvent(event: AuditEvent): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      p_action: event.action,
      p_resource_type: event.resource_type,
      p_resource_id: event.resource_id,
      p_old_values: event.old_values ? JSON.stringify(event.old_values) : null,
      p_new_values: event.new_values ? JSON.stringify(event.new_values) : null
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - audit logging should not break application flow
  }
}

/**
 * Get audit logs (admin only)
 */
export async function getAuditLogs(limit: number = 100) {
  return await supabase
    .from('security_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(resourceType: string, resourceId: string, limit: number = 50) {
  return await supabase
    .from('security_audit')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId: string, limit: number = 100) {
  return await supabase
    .from('security_audit')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}