import { Property } from "@/hooks/useProperties";

/**
 * Determines if the current user can view sensitive property fields
 * (unit_number, documents) based on their role and ownership
 */
export const canViewSensitiveFields = (
  property: Property,
  currentUserId: string | undefined,
  userRole: string | undefined
): boolean => {
  // Admins can see everything
  if (userRole === 'admin') return true;
  
  // Property creator (agent who added it) can see their own sensitive fields
  if (property.agent_id === currentUserId) return true;
  
  // Everyone else cannot see sensitive fields
  return false;
};
