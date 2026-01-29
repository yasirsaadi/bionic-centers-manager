import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Iraq timezone constant
const IRAQ_TIMEZONE = 'Asia/Baghdad';

// Iraq is UTC+3
const IRAQ_OFFSET_MS = 3 * 60 * 60 * 1000;

// Convert any date to Iraq local time components
// Returns a Date object where getUTC* methods give Iraq local time values
function toIraqTime(dateInput: Date | string): Date {
  let utcMs: number;
  
  if (dateInput instanceof Date) {
    utcMs = dateInput.getTime();
  } else {
    const str = dateInput.toString();
    // Parse the date - JavaScript will interpret it correctly
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) {
      return parsed; // Invalid date
    }
    utcMs = parsed.getTime();
  }
  
  // Add Iraq offset (UTC+3) to get Iraq local time
  // Store it in a Date where getUTC* methods return Iraq local time
  return new Date(utcMs + IRAQ_OFFSET_MS);
}

// Format date for display (day/month/year) - converts to Iraq timezone
export function formatDateIraq(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = toIraqTime(date);
  if (isNaN(d.getTime())) return '';
  
  // Use UTC methods since we shifted the time to represent Iraq local time
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Format time for display (12-hour with AM/PM in Arabic) - converts to Iraq timezone
export function formatTimeIraq(date: Date | string | null | undefined): string {
  if (!date) return 'وقت غير محدد';
  const d = toIraqTime(date);
  if (isNaN(d.getTime())) return 'وقت غير محدد';
  
  // Use UTC methods since we shifted the time to represent Iraq local time
  let hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}

// Format date and time together - converts to Iraq timezone
export function formatDateTimeIraq(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = toIraqTime(date);
  if (isNaN(d.getTime())) return '';
  return `${formatDateIraq(date)} - ${formatTimeIraq(date)}`;
}

// Format date for display with short month format - converts to Iraq timezone
export function formatDateIraqShort(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = toIraqTime(date);
  if (isNaN(d.getTime())) return '';
  
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${month} ${year}`;
}

// Get current date/time in Iraq timezone as YYYY-MM-DD string
export function getTodayIraq(): string {
  const now = new Date();
  // Convert current UTC time to Iraq time
  const iraqOffset = 3 * 60; // Iraq is UTC+3
  const iraqTime = new Date(now.getTime() + iraqOffset * 60 * 1000);
  return iraqTime.toISOString().split('T')[0];
}

// Get current time in Iraq timezone for new records
export function getNowIraq(): Date {
  const now = new Date();
  const iraqOffset = 3 * 60; // Iraq is UTC+3, in minutes
  return new Date(now.getTime() + iraqOffset * 60 * 1000);
}

// Convert Arabic/Persian digits to English digits
export function toEnglishDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
  }
  return result;
}
