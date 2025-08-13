import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'agent';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  assigned_by?: string;
  assigned_at: string;
}

/**
 * Get the current user's role from the secure user_roles table
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  const { data, error } = await supabase.rpc('get_current_user_role');
  
  if (error) {
    console.error('Error fetching user role:', error);
    return 'agent'; // Default to agent on error
  }
  
  return data as UserRole || 'agent';
}

/**
 * Get user role for a specific user (admin only)
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase.rpc('get_user_role_secure', { user_uuid: userId });
  
  if (error) {
    console.error('Error fetching user role:', error);
    return 'agent';
  }
  
  return data as UserRole || 'agent';
}

/**
 * Check if current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const userRole = await getCurrentUserRole();
  return userRole === role;
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Assign role to user (admin only)
 */
export async function assignUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to assign role' };
  }
}

/**
 * Get all user roles (admin only)
 */
export async function getAllUserRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      *,
      profiles!user_roles_user_id_fkey(name, email)
    `)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}