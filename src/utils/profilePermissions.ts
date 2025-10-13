/**
 * Profile Security Utilities
 * 
 * Implements collaborative security for team environments.
 * - Email: Visible to all authenticated users for team collaboration
 * - Phone: Protected - only visible to profile owner and admins
 */

export interface ProfileData {
  user_id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Determines if the current user can view phone numbers without masking
 * Note: Email is visible to all authenticated users for collaboration
 */
export const canViewPhoneNumber = (
  profileUserId: string,
  currentUserId: string | undefined,
  userRole: string | undefined
): boolean => {
  // Admins and superadmins can see all phone numbers
  if (userRole === 'admin' || userRole === 'superadmin') return true;
  
  // Users can see their own phone numbers
  if (profileUserId === currentUserId) return true;
  
  // Everyone else cannot see phone numbers (team collaboration doesn't require phone)
  return false;
};

/**
 * @deprecated Use canViewPhoneNumber instead. Email is now visible to all authenticated users.
 */
export const canViewSensitiveProfile = canViewPhoneNumber;

/**
 * Masks an email address for unauthorized viewers
 * Note: In collaborative mode, emails are visible to all authenticated users
 * This function is kept for backward compatibility
 * @deprecated Email masking is not used in collaborative security mode
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***@***.com';
  
  const [name, domain] = email.split('@');
  if (name.length <= 2) {
    return `${name[0]}***@${domain}`;
  }
  return `${name.substring(0, 2)}***@${domain}`;
};

/**
 * Masks a phone number for unauthorized viewers
 * Example: +1-555-123-4567 → +1-555-***-4567
 * Example: 5551234567 → 555***4567
 */
export const maskPhone = (phone: string): string => {
  if (!phone) return '***-***-****';
  
  // Remove all non-digit characters for processing
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 6) {
    return '***-***-****';
  }
  
  // Keep first 3 and last 4 digits, mask the middle
  const first = digitsOnly.substring(0, 3);
  const last = digitsOnly.substring(digitsOnly.length - 4);
  
  return `${first}***${last}`;
};

/**
 * Applies masking to a profile based on viewer permissions
 * In collaborative mode: Only masks phone numbers for unauthorized viewers
 * Email is visible to all authenticated users for team collaboration
 */
export const applyProfileMasking = (
  profile: ProfileData,
  currentUserId: string | undefined,
  userRole: string | undefined
): ProfileData => {
  const canViewPhone = canViewPhoneNumber(
    profile.user_id,
    currentUserId,
    userRole
  );

  if (canViewPhone) {
    // Return original profile for authorized viewers (own profile or admin)
    return profile;
  }

  // In collaborative mode: only mask phone, keep email visible for team collaboration
  return {
    ...profile,
    // Email remains unmasked for team visibility
    phone: profile.phone ? maskPhone(profile.phone) : null,
  };
};

/**
 * Checks if a field is currently masked
 */
export const isFieldMasked = (value: string): boolean => {
  return value.includes('***');
};

/**
 * Gets a user-friendly message for masked fields
 */
export const getMaskedFieldMessage = (fieldType: 'email' | 'phone'): string => {
  const messages = {
    email: 'Email visible to team members', // Updated for collaborative mode
    phone: 'Phone number hidden for privacy',
  };
  return messages[fieldType];
};
