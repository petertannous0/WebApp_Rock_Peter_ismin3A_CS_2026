/**
 * Days travel as "YYYY-MM-DD" strings in the API, and are stored as
 * DateTime at midnight UTC. These two functions are the only crossing point.
 */

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 2027-06-21T00:00:00.000Z → "2027-06-21" */
export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2027-06-21" → 2027-06-21T00:00:00.000Z */
export function fromDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
