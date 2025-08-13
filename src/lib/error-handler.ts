/**
 * Secure error handler that prevents information disclosure
 */

export interface SecureError {
  message: string;
  code?: string;
  isPublic: boolean;
}

/**
 * Handle errors securely - log full details but only return safe messages to users
 */
export function handleSecureError(error: any, context?: string): SecureError {
  // Log the full error for debugging (server-side only in production)
  console.error(`Security Error${context ? ` in ${context}` : ''}:`, error);
  
  // Map specific error codes to user-friendly messages
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // Database constraint violations
  if (errorMessage.includes('violates row-level security')) {
    return {
      message: 'You do not have permission to perform this action',
      code: 'PERMISSION_DENIED',
      isPublic: true
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('JWT') || errorMessage.includes('auth')) {
    return {
      message: 'Authentication required. Please log in again',
      code: 'AUTH_REQUIRED',
      isPublic: true
    };
  }
  
  // Validation errors (safe to show)
  if (errorMessage.includes('Invalid email') || 
      errorMessage.includes('Invalid phone') ||
      errorMessage.includes('exceeds maximum limit')) {
    return {
      message: errorMessage,
      code: 'VALIDATION_ERROR',
      isPublic: true
    };
  }
  
  // Role assignment errors
  if (errorMessage.includes('Only administrators can assign roles')) {
    return {
      message: 'Only administrators can assign roles',
      code: 'INSUFFICIENT_PRIVILEGES',
      isPublic: true
    };
  }
  
  // File upload errors
  if (errorMessage.includes('File size exceeds') || 
      errorMessage.includes('Invalid file type')) {
    return {
      message: errorMessage,
      code: 'FILE_ERROR',
      isPublic: true
    };
  }
  
  // Generic fallback - don't expose internal errors
  return {
    message: 'An error occurred while processing your request. Please try again.',
    code: 'INTERNAL_ERROR',
    isPublic: false
  };
}

/**
 * Safely format error for user display
 */
export function formatErrorForUser(error: any, context?: string): string {
  const secureError = handleSecureError(error, context);
  return secureError.message;
}

/**
 * Check if error should be shown to user
 */
export function isErrorPublic(error: any): boolean {
  const secureError = handleSecureError(error);
  return secureError.isPublic;
}