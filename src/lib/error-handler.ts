/**
 * Formats errors for user display while maintaining security
 * Prevents sensitive information leakage in production
 */
export function formatErrorForUser(error: any, context?: string): string {
  // Handle empty object errors
  if (error && typeof error === 'object' && Object.keys(error).length === 0) {
    return 'An error occurred. Please try again.';
  }
  
  // Handle string errors that are empty or "{}"
  if (typeof error === 'string' && (error === '{}' || error.trim() === '')) {
    return 'An error occurred. Please try again.';
  }
  // If it's already a user-friendly message, return it
  if (typeof error === 'string') {
    return error;
  }

  // Handle Supabase errors
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (message.includes('user already registered')) {
      return 'An account with this email already exists. Please try logging in instead.';
    }
    
    if (message.includes('email rate limit exceeded')) {
      return 'Too many email attempts. Please wait a few minutes before trying again.';
    }
    
    // Permission errors
    if (message.includes('row level security') || message.includes('permission denied')) {
      return 'You do not have permission to access this resource.';
    }
    
    // File upload errors
    if (message.includes('file size') || message.includes('10mb')) {
      return 'File size exceeds the maximum limit of 10MB.';
    }
    
    if (message.includes('file type')) {
      return 'File type not supported. Please use JPG, PNG, WEBP, or PDF files.';
    }
    
    // Role assignment errors
    if (message.includes('only administrators can assign roles')) {
      return 'Only administrators can manage user roles.';
    }
    
    // Validation errors
    if (message.includes('invalid email format')) {
      return 'Please enter a valid email address.';
    }
    
    if (message.includes('invalid phone number')) {
      return 'Please enter a valid phone number.';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Database errors (generic)
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return 'This record already exists. Please check for duplicates.';
    }
    
    if (message.includes('foreign key')) {
      return 'Cannot complete this action due to related data dependencies.';
    }
  }

  // Development vs Production error handling
  if (process.env.NODE_ENV === 'development') {
    console.error(`Error in ${context}:`, error);
    return error?.message || 'An unexpected error occurred during development.';
  }

  // Generic production error
  console.error(`Production error in ${context}:`, error);
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Logs security events for monitoring
 */
export function logSecurityEvent(event: string, details?: any): void {
  // In production, this would send to a monitoring service
  console.warn(`Security Event: ${event}`, details);
  
  // Example: Send to monitoring service
  // if (process.env.NODE_ENV === 'production') {
  //   analytics.track('security_event', { event, details, timestamp: Date.now() });
  // }
}