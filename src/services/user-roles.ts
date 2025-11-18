import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'agent' | 'user' | 'superadmin';

/**
 * Gets the current user's role from the secure user_roles table
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'agent';

    // Fetch all roles for the user and pick the highest-precedence one
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!rolesError && rolesData && rolesData.length > 0) {
      const roles = rolesData.map(r => r.role as UserRole);
      if (roles.includes('superadmin')) return 'superadmin';
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('agent')) return 'agent';
      if (roles.includes('user')) return 'user';
    }

    // Default to agent if no role found or error
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
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return { error: { message: 'User not authenticated' } };
    }

    // Log the role assignment attempt
    await supabase.rpc('log_security_event', {
      p_action: 'role_assignment_attempt',
      p_resource_type: 'user_roles',
      p_resource_id: userId,
      p_new_values: { role, assigned_by: currentUser.id }
    });

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role,
        assigned_by: currentUser.id,
        assigned_at: new Date().toISOString()
      });

    if (!error) {
      // Log successful role assignment
      await supabase.rpc('log_security_event', {
        p_action: 'role_assigned',
        p_resource_type: 'user_roles',
        p_resource_id: userId,
        p_new_values: { role, assigned_by: currentUser.id }
      });
    }

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
      *
    `)
    .order('assigned_at', { ascending: false });
}

/**
 * Removes a role from a user (admin only)
 */
export async function removeUserRole(userId: string, role: UserRole): Promise<{ error?: any }> {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return { error: { message: 'User not authenticated' } };
    }

    // Log the role removal attempt
    await supabase.rpc('log_security_event', {
      p_action: 'role_removal_attempt',
      p_resource_type: 'user_roles',
      p_resource_id: userId,
      p_old_values: { role }
    });

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (!error) {
      // Log successful role removal
      await supabase.rpc('log_security_event', {
        p_action: 'role_removed',
        p_resource_type: 'user_roles',
        p_resource_id: userId,
        p_old_values: { role, removed_by: currentUser.id }
      });
    }

    return { error };
  } catch (error) {
    return { error };
  }
}