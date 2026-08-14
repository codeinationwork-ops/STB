/**
 * Centralized Phone & WhatsApp Utilities for SilaiHub CRM
 * Prevents double +91 country codes and enforces exact 10-digit mobile numbers.
 */

/**
 * Extracts and cleans a mobile number to strictly 10 digits.
 * Safely removes country codes (+91, 91, 0091, 0), spaces, dashes, parentheses.
 * 
 * Examples:
 * "+91 9876543210" -> "9876543210"
 * "+91+919876543210" -> "9876543210"
 * "919876543210" -> "9876543210"
 * "09876543210" -> "9876543210"
 * "9876543210" -> "9876543210"
 */
export function clean10DigitPhone(rawPhone: string | undefined | null): string {
  if (!rawPhone) return '';
  
  // Remove all non-numeric characters
  let digits = String(rawPhone).replace(/\D/g, '');
  
  // Strip repeated leading 91 prefixes (e.g. 91919876543210 or 919876543210)
  while (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  
  // Strip leading 0 (e.g. 09876543210)
  while (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // If still longer than 10, take the last 10 digits
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  
  return digits;
}

/**
 * Validates if the phone number contains exactly 10 digits.
 */
export function isValid10DigitPhone(rawPhone: string | undefined | null): boolean {
  const tenDigits = clean10DigitPhone(rawPhone);
  return tenDigits.length === 10;
}

/**
 * Formats a phone number for clean UI display: "+91 9876543210"
 */
export function formatDisplayPhone(rawPhone: string | undefined | null): string {
  const tenDigits = clean10DigitPhone(rawPhone);
  if (!tenDigits) return '';
  return `+91 ${tenDigits}`;
}

/**
 * Generates a clean WhatsApp URL ensuring EXACTLY ONE "91" country code prefix.
 * Never produces double +91 (e.g. https://wa.me/9191... is strictly impossible).
 */
export function getWhatsAppUrl(rawPhone: string | undefined | null, message: string): string {
  const tenDigits = clean10DigitPhone(rawPhone);
  const encodedMsg = encodeURIComponent(message.trim());
  return `https://wa.me/91${tenDigits}?text=${encodedMsg}`;
}

/**
 * Handles user typing/pasting in mobile input fields.
 * Strips "+91", "91", "0" prefix automatically if pasted and caps at 10 digits.
 */
export function sanitizePhoneInput(inputVal: string): string {
  let digits = inputVal.replace(/\D/g, '');
  
  // If user pasted a full number with country code e.g. "919876543210"
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // Limit to 10 characters maximum
  return digits.slice(0, 10);
}
