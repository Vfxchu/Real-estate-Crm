/**
 * Dubai Timezone Utilities
 * 
 * All date/time operations in this CRM use Dubai timezone (Asia/Dubai).
 * This module provides utilities to ensure consistent timezone handling.
 */

import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

export const DUBAI_TIMEZONE = 'Asia/Dubai';

/**
 * Convert a UTC date to Dubai timezone
 */
export function toDubaiTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, DUBAI_TIMEZONE);
}

/**
 * Convert a Dubai timezone date to UTC for storage
 * @param date - The date in Dubai timezone
 * @param time - Optional time string in HH:mm format
 */
export function toUTC(date: Date | string, time?: string): Date {
  let dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    dateObj.setHours(hours, minutes, 0, 0);
  }
  
  return fromZonedTime(dateObj, DUBAI_TIMEZONE);
}

/**
 * Format a date in Dubai timezone
 */
export function formatDubaiTime(date: Date | string, formatStr: string = 'PPp'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, DUBAI_TIMEZONE, formatStr);
}

/**
 * Get current date/time in Dubai timezone
 */
export function nowInDubai(): Date {
  return toZonedTime(new Date(), DUBAI_TIMEZONE);
}

/**
 * Extract time string (HH:mm) from a date in Dubai timezone
 */
export function getDubaiTimeString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, DUBAI_TIMEZONE, 'HH:mm');
}

/**
 * Extract date string (yyyy-MM-dd) from a date in Dubai timezone
 */
export function getDubaiDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, DUBAI_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Create a Date object from separate date and time inputs (assumed to be in Dubai timezone)
 * Returns UTC date for storage
 */
export function createDubaiDateTime(dateStr: string, timeStr: string): Date {
  // Create date in local context first
  const [hours, minutes] = timeStr.split(':').map(Number);
  const localDate = new Date(dateStr);
  localDate.setHours(hours, minutes, 0, 0);
  
  // Convert from Dubai timezone to UTC
  return fromZonedTime(localDate, DUBAI_TIMEZONE);
}
