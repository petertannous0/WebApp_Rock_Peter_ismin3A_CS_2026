import type { HalfDay } from './types';

/**
 * Dates and times written the French way. The days of the session are
 * "YYYY-MM-DD" strings at midnight UTC: they are read in UTC, so that a
 * browser west of Greenwich does not show the day before.
 */

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

export function formatShortDay(day: string): string {
  return SHORT_DAY.format(new Date(`${day}T00:00:00Z`));
}

export function formatTime(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export const HALF_DAY_LABELS: Record<HalfDay, string> = {
  MORNING: 'matin',
  AFTERNOON: 'après-midi',
};

export function formatHalfDay(day: string, halfDay: HalfDay): string {
  return `${formatDay(day)}, ${HALF_DAY_LABELS[halfDay]}`;
}

const DAY_WITH_YEAR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatDayWithYear(day: string): string {
  return DAY_WITH_YEAR.format(new Date(`${day}T00:00:00Z`));
}
