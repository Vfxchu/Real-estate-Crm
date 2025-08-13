import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'agent';

/**
 * Gets the current user's role from the secure user_roles table
 * Falls back to profiles table for backward compatibility
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'agent';

    // First try the new secure user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleError && roleData) {
      return roleData.role as UserRole;
    }

    // Fallback to profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profileError && profileData) {
      return profileData.role as UserRole;
    }

    return 'agent'; // Default role
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