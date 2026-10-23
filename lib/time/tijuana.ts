/**
 * Canonical Timezone Utilities for Zanita (America/Tijuana)
 *
 * All business scheduling, day cuts, and operations MUST be anchored
 * to the business local timezone to avoid UTC day-shift bugs.
 */

export const TIJUANA_TIMEZONE = 'America/Tijuana';

/**
 * Returns today's business date string in YYYY-MM-DD format according to America/Tijuana.
 */
export function getTijuanaDateString(date: Date = new Date()): string {
  // 'en-CA' canonically outputs YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIJUANA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns true if the given YYYY-MM-DD date string matches today in Tijuana.
 */
export function isTijuanaToday(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr === getTijuanaDateString();
}

/**
 * Returns true if the given YYYY-MM-DD date string is strictly in the future.
 */
export function isTijuanaFuture(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = getTijuanaDateString();
  return dateStr > today;
}

/**
 * Formats a time string (e.g. "15:40:00" or "15:40") to HH:MM.
 */
export function formatTimeShort(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--';
  return timeStr.slice(0, 5);
}

const SPANISH_WEEKDAYS_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const SPANISH_WEEKDAYS_SHORT = [
  'dom',
  'lun',
  'mar',
  'mié',
  'jue',
  'vie',
  'sáb',
];

const SPANISH_MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SPANISH_MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * Parses YYYY-MM-DD into [year, month, day] numbers.
 * Returns null if the format is invalid.
 */
function parseDateParts(dateStr: string | null | undefined): [number, number, number] | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Formats a YYYY-MM-DD calendar date string into a friendly localized Spanish string.
 * Example: "martes, 13 de octubre de 2026"
 * Pure calendar calculation: 0% dependency on runtime timezone or UTC shifts.
 */
export function formatDateLong(dateStr: string | null | undefined): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr || '';
  const [year, month, day] = parts;

  // Compute day-of-week purely in UTC noon to avoid any midnight timezone boundary shifts
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = SPANISH_WEEKDAYS_LONG[d.getUTCDay()];
  const monthName = SPANISH_MONTHS_LONG[month - 1];

  return `${weekday}, ${day} de ${monthName} de ${year}`;
}

/**
 * Formats a YYYY-MM-DD calendar date string into a compact format.
 * Example: "mar, 13 oct"
 * Pure calendar calculation: 0% dependency on runtime timezone or UTC shifts.
 */
export function formatDateCompact(dateStr: string | null | undefined): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr || '';
  const [year, month, day] = parts;

  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = SPANISH_WEEKDAYS_SHORT[d.getUTCDay()];
  const monthName = SPANISH_MONTHS_SHORT[month - 1];

  return `${weekday}, ${day} ${monthName}`;
}
