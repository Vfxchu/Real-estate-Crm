/**
 * Profile Security Utilities
 * 
 * Implements strict security for sensitive profile fields (email, phone).
 * Only profile owners and admins can view unmasked sensitive data.
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
 * Determines if the current user can view sensitive profile fields
 * (email, phone) without masking
 */
export const canViewSensitiveProfile = (
  profileUserId: string,
  currentUserId: string | undefined,
  userRole: string | undefined
): boolean => {
  // Admins and superadmins can see all sensitive fields
  if (userRole === 'admin' || userRole === 'superadmin') return true;
  
  // Users can see their own sensitive fields
  if (profileUserId === currentUserId) return true;
  
  // Everyone else cannot see sensitive fields
  return false;
};

/**
 * Masks an email address for unauthorized viewers
 * Example: john.doe@example.com → jo***@example.com
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
 * Returns a new profile object with masked fields if unauthorized
 */
export const applyProfileMasking = (
  profile: ProfileData,
  currentUserId: string | undefined,
  userRole: string | undefined
): ProfileData => {
  const canViewSensitive = canViewSensitiveProfile(
    profile.user_id,
    currentUserId,
    userRole
  );

  if (canViewSensitive) {
    // Return original profile for authorized viewers
    return profile;
  }

  // Return masked profile for unauthorized viewers
  return {
    ...profile,
    email: maskEmail(profile.email),
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
    email: 'Email hidden for privacy',
    phone: 'Phone hidden for privacy',
  };
  return messages[fieldType];
};
