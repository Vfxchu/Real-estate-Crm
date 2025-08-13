import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes user input by escaping HTML entities
 * @param input - The user input to sanitize
 * @returns Escaped string safe for display
 */
export const escapeHtml = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validates and sanitizes email input
 * @param email - Email to validate
 * @returns Valid email or throws error
 */
export const validateEmail = (email: string): string => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
};

/**
 * Validates and sanitizes phone number
 * @param phone - Phone number to validate
 * @returns Sanitized phone number
 */
export const validatePhone = (phone: string): string => {
  const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
  const sanitized = phone.replace(/[^\d\+\-\(\)\s]/g, '');
  
  if (!phoneRegex.test(sanitized)) {
    throw new Error('Invalid phone number format');
  }
  
  return sanitized;
};

/**
 * Sanitizes general text input
 * @param input - Text input to sanitize
 * @returns Sanitized text
 */
export const sanitizeTextInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input.replace(/[<>"\';&#]/g, '').trim();
};

/**
 * Validates file upload
 * @param file - File to validate
 * @param maxSize - Maximum file size in bytes (default 10MB)
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result
 */
export const validateFileUpload = (
  file: File, 
  maxSize: number = 10485760, // 10MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): { isValid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds maximum limit of 10MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  return { isValid: true };
};