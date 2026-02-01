import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const IRAQ_TIMEZONE = 'Asia/Baghdad';

// Format date for display (day/month/year) - converts UTC to Iraq timezone
export function formatDateIraq(date: Date | string | null | undefined): string {
  if (!date) return '';
  // Parse the date as UTC first, then convert to Baghdad timezone
  const d = dayjs.utc(date).tz(IRAQ_TIMEZONE);
  if (!d.isValid()) return '';
  return d.format('DD/MM/YYYY');
}

// Format time for display (12-hour with AM/PM in Arabic) - converts UTC to Iraq timezone
export function formatTimeIraq(date: Date | string | null | undefined): string {
  if (!date) return 'وقت غير محدد';
  // Parse the date as UTC first, then convert to Baghdad timezone
  const d = dayjs.utc(date).tz(IRAQ_TIMEZONE);
  if (!d.isValid()) return 'وقت غير محدد';
  
  const hours = d.hour();
  const minutes = d.format('mm');
  const ampm = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Format date and time together - converts UTC to Iraq timezone
export function formatDateTimeIraq(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = dayjs.utc(date).tz(IRAQ_TIMEZONE);
  if (!d.isValid()) return '';
  return `${formatDateIraq(date)} - ${formatTimeIraq(date)}`;
}

// Format date for display with short month format - converts UTC to Iraq timezone
export function formatDateIraqShort(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = dayjs.utc(date).tz(IRAQ_TIMEZONE);
  if (!d.isValid()) return '';
  
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const month = months[d.month()];
  const year = d.year();
  return `${month} ${year}`;
}

// Get current date in Iraq timezone as YYYY-MM-DD string
export function getTodayIraq(): string {
  return dayjs().tz(IRAQ_TIMEZONE).format('YYYY-MM-DD');
}

// Get current time in Iraq timezone for new records (returns ISO string)
export function getNowIraq(): string {
  return dayjs().tz(IRAQ_TIMEZONE).toISOString();
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
