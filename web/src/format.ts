import type { HalfDay } from './types';

/**
 * Dates and times written the French way. The days of the session are
 * "YYYY-MM-DD" strings at midnight UTC: they are read in UTC, so that a
 * browser west of Greenwich does not show the day before.
 */

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** "2027-06-21" → "lundi 21 juin" */
export function formatDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

/** "2027-06-21" → "lun. 21" */
export function formatShortDay(day: string): string {
  return SHORT_DAY.format(new Date(`${day}T00:00:00Z`));
}

/** 550 → "9 h 10", 810 → "13 h 30": the client's way of writing a time. */
export function formatTime(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** An ISO timestamp → "10/05/2027" */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export const HALF_DAY_LABELS: Record<HalfDay, string> = {
  MORNING: 'matin',
  AFTERNOON: 'après-midi',
};

/** "lundi 21 juin, après-midi" */
export function formatHalfDay(day: string, halfDay: HalfDay): string {
  return `${formatDay(day)}, ${HALF_DAY_LABELS[halfDay]}`;
}
