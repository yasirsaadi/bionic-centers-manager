import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IRAQ_TIMEZONE = 'Asia/Baghdad';

// Get current time in Iraq timezone as a Date object
export function getNowIraq(): Date {
  return dayjs().tz(IRAQ_TIMEZONE).toDate();
}

// Get current time in Iraq timezone as ISO string
export function getNowIraqISO(): string {
  return dayjs().tz(IRAQ_TIMEZONE).toISOString();
}

// Convert a date to Iraq timezone
export function toIraqTimezone(date: Date | string): Date {
  return dayjs(date).tz(IRAQ_TIMEZONE).toDate();
}

// Get today's date in Iraq timezone as YYYY-MM-DD
export function getTodayIraq(): string {
  return dayjs().tz(IRAQ_TIMEZONE).format('YYYY-MM-DD');
}

// Get start of day in Iraq timezone
export function getStartOfDayIraq(date?: Date | string): Date {
  const d = date ? dayjs(date).tz(IRAQ_TIMEZONE) : dayjs().tz(IRAQ_TIMEZONE);
  return d.startOf('day').toDate();
}

// Get end of day in Iraq timezone
export function getEndOfDayIraq(date?: Date | string): Date {
  const d = date ? dayjs(date).tz(IRAQ_TIMEZONE) : dayjs().tz(IRAQ_TIMEZONE);
  return d.endOf('day').toDate();
}

export { dayjs, IRAQ_TIMEZONE };
