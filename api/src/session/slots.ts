/**
 * The time grid of a session, from the client's rules. Pure: no NestJS, no
 * Prisma, used by the seed and by the session service.
 *
 *   40-minute slots, back to back, no break between them
 *   morning    8:30  9:10  9:50  10:30  11:10  11:50   (ends 12:30)
 *   lunch      12:30 – 13:30
 *   afternoon 13:30 14:10 14:50  15:30  16:10  16:50   (ends 17:30)
 *   Monday to Friday: 12 slots × 5 days
 */

export type HalfDay = 'MORNING' | 'AFTERNOON';

export const SLOT_MINUTES = 40;
export const SLOTS_PER_HALF_DAY = 6;
export const DAYS_IN_SESSION = 5;
export const MORNING_START = 8 * 60 + 30;
export const AFTERNOON_START = 13 * 60 + 30;
export const THURSDAY = 3;

export interface SlotSpec {
  date: Date;
  dayIndex: number;
  indexInDay: number;
  startMinutes: number;
  halfDay: HalfDay;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when `date` is a Monday, read in UTC: the session dates are stored at midnight UTC. */
export function isMonday(date: Date): boolean {
  return date.getUTCDay() === 1;
}

export function dayOfSession(monday: Date, dayIndex: number): Date {
  const midnight = Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
  return new Date(midnight + dayIndex * DAY_MS);
}

export function generateSlots(monday: Date): SlotSpec[] {
  const slots: SlotSpec[] = [];
  for (let dayIndex = 0; dayIndex < DAYS_IN_SESSION; dayIndex++) {
    const date = dayOfSession(monday, dayIndex);
    for (const [halfDay, start] of [
      ['MORNING', MORNING_START],
      ['AFTERNOON', AFTERNOON_START],
    ] as const) {
      for (let i = 0; i < SLOTS_PER_HALF_DAY; i++) {
        slots.push({
          date,
          dayIndex,
          indexInDay: slots.length % (2 * SLOTS_PER_HALF_DAY),
          startMinutes: start + i * SLOT_MINUTES,
          halfDay,
        });
      }
    }
  }
  return slots;
}
