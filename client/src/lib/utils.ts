import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Iraq timezone constant
const IRAQ_TIMEZONE = 'Asia/Baghdad';

// Format date in Iraq timezone (day/month/year)
export function formatDateIraq(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { 
    timeZone: IRAQ_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format time in Iraq timezone (12-hour with AM/PM in Arabic)
export function formatTimeIraq(date: Date | string | null | undefined): string {
  if (!date) return 'وقت غير محدد';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'وقت غير محدد';
  return d.toLocaleTimeString('ar-IQ', { 
    timeZone: IRAQ_TIMEZONE,
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
}

// Format date and time together in Iraq timezone
export function formatDateTimeIraq(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return `${formatDateIraq(d)} - ${formatTimeIraq(d)}`;
}

// Format date for display with optional short format
export function formatDateIraqShort(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-IQ', { 
    timeZone: IRAQ_TIMEZONE,
    month: 'short', 
    year: 'numeric' 
  });
}

// Get current date in Iraq timezone as YYYY-MM-DD string
export function getTodayIraq(): string {
  const now = new Date();
  const iraqDate = new Date(now.toLocaleString('en-US', { timeZone: IRAQ_TIMEZONE }));
  return iraqDate.toISOString().split('T')[0];
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
