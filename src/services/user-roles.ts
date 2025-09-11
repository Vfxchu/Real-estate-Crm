import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'agent';

/**
 * Gets the current user's role from the secure user_roles table
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'agent';

    // Use the secure user_roles table as the authoritative source
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleError && roleData) {
      return roleData.role as UserRole;
    }

    // Default to agent if no role found
    return 'agent';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'agent';
  }
}

/**
 * Assigns a role to a user (admin only)
 */
export async function assignUserRole(userId: string, role: UserRole): Promise<{ error?: any }> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
        assigned_at: new Date().toISOString()
      });

    return { error };
  } catch (error) {
    return { error };
  }
}

/**
 * Gets all user roles (admin only)
 */
export async function getAllUserRoles() {
  return await supabase
    .from('user_roles')
    .select(`
      *,
      profiles!user_roles_user_id_fkey(name, email)
    `)
    .order('assigned_at', { ascending: false });
}

/**
 * Removes a role from a user (admin only)
 */
export async function removeUserRole(userId: string, role: UserRole): Promise<{ error?: any }> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    return { error };
  } catch (error) {
    return { error };
  }
}