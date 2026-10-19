/**
 * Sri Lankan Localization Utilities for MediPlus
 * Handles NIC, Phone, Currency (LKR), Timezone (Asia/Colombo), and Administrative Divisions
 */

export interface NicValidationResult {
  isValid: boolean;
  format?: 'OLD' | 'NEW';
  gender?: 'MALE' | 'FEMALE';
  yearOfBirth?: number;
  dayOfYear?: number;
  message?: string;
}

/**
 * Validates Sri Lankan National Identity Card (NIC).
 * Supports both:
 * - Old format: 9 digits + 'V' or 'X' (e.g., 853412589V)
 * - New format: 12 digits (e.g., 198534125890)
 */
export function validateSriLankanNIC(nic: string): NicValidationResult {
  if (!nic || typeof nic !== 'string') {
    return { isValid: false, message: 'NIC is required' };
  }

  const cleanNic = nic.trim().toUpperCase();

  // Old NIC format: 9 digits followed by V or X
  const oldNicRegex = /^([0-9]{2})([0-9]{3})([0-9]{4})([VX])$/;
  const oldMatch = cleanNic.match(oldNicRegex);

  if (oldMatch) {
    const yearPrefix = 1900;
    const year = yearPrefix + parseInt(oldMatch[1], 10);
    let days = parseInt(oldMatch[2], 10);

    let gender: 'MALE' | 'FEMALE' = 'MALE';
    if (days > 500) {
      gender = 'FEMALE';
      days -= 500;
    }

    if (days < 1 || days > 366) {
      return { isValid: false, message: 'Invalid day of year in old NIC format' };
    }

    return {
      isValid: true,
      format: 'OLD',
      gender,
      yearOfBirth: year,
      dayOfYear: days,
    };
  }

  // New NIC format: 12 digits
  const newNicRegex = /^([0-9]{4})([0-9]{3})([0-9]{5})$/;
  const newMatch = cleanNic.match(newNicRegex);

  if (newMatch) {
    const year = parseInt(newMatch[1], 10);
    let days = parseInt(newMatch[2], 10);

    let gender: 'MALE' | 'FEMALE' = 'MALE';
    if (days > 500) {
      gender = 'FEMALE';
      days -= 500;
    }

    if (days < 1 || days > 366) {
      return { isValid: false, message: 'Invalid day of year in new NIC format' };
    }

    // Basic century check
    if (year < 1900 || year > 2050) {
      return { isValid: false, message: 'Invalid birth year in new NIC format' };
    }

    return {
      isValid: true,
      format: 'NEW',
      gender,
      yearOfBirth: year,
      dayOfYear: days,
    };
  }

  return { isValid: false, message: 'Invalid Sri Lankan NIC format (Must be 9 digits + V/X or 12 digits)' };
}

/**
 * Validates and normalizes Sri Lankan phone numbers.
 * Supports:
 * - Mobile: 070, 071, 072, 074, 075, 076, 077, 078
 * - Landlines: 011, 021, 023, 024, 025, 026, 027, 031, 032, 033, 034, 035, 036, 037, 038, 041, 045, 047, 051, 052, 054, 055, 057, 063, 065, 066, 067, 081, 091
 * - International prefix: +94
 */
export function validateSriLankanPhone(phone: string): { isValid: boolean; normalized?: string; message?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, message: 'Phone number is required' };
  }

  // Remove whitespace, dashes, parentheses
  const clean = phone.replace(/[\s\-\(\)]/g, '');

  // Check +94 format: +94XXXXXXXXX (9 digits after +94)
  if (/^\+94[0-9]{9}$/.test(clean)) {
    const formatted = `+94 ${clean.substring(3, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
    return { isValid: true, normalized: formatted };
  }

  // Check 0-prefixed format: 0XXXXXXXXX (10 digits starting with 0)
  if (/^0[0-9]{9}$/.test(clean)) {
    const formatted = `+94 ${clean.substring(1, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
    return { isValid: true, normalized: formatted };
  }

  // Check 9-digit format without leading 0 (e.g. 771234567)
  if (/^[1-9][0-9]{8}$/.test(clean)) {
    const formatted = `+94 ${clean.substring(0, 2)} ${clean.substring(2, 5)} ${clean.substring(5)}`;
    return { isValid: true, normalized: formatted };
  }

  return { isValid: false, message: 'Invalid Sri Lankan phone number (+94 XX XXX XXXX or 0XX-XXXXXXX)' };
}

/**
 * Format currency amount in Sri Lankan Rupees (LKR)
 * Example: formatLKR(2500) -> "LKR 2,500.00"
 */
export function formatLKR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'LKR 0.00';
  }
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
  const formattedNumber = numeric.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `LKR ${formattedNumber}`;
}

/**
 * Format date in standard Sri Lankan Hospital format: DD/MM/YYYY
 */
export function formatSriLankanDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  
  // Format in Asia/Colombo timezone
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date and time in Sri Lankan timezone: DD/MM/YYYY hh:mm A
 */
export function formatSriLankanDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Sri Lankan Administrative Provinces and Districts mapping
 */
export const SRI_LANKA_PROVINCES: Record<string, string[]> = {
  'Western': ['Colombo', 'Gampaha', 'Kalutara'],
  'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
  'Southern': ['Galle', 'Matara', 'Hambantota'],
  'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
  'Eastern': ['Batticaloa', 'Ampara', 'Trincomalee'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  'Uva': ['Badulla', 'Monaragala'],
  'Sabaragamuwa': ['Ratnapura', 'Kegalle'],
};

export const ALL_DISTRICTS = Object.values(SRI_LANKA_PROVINCES).flat();
