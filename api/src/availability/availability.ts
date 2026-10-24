import type { HalfDay } from '../session/slots.js';

export interface HalfDaySlot {
  day: string;
  halfDay: HalfDay;
}

/**
 * A defense of the teacher that falls in a half-day they now say they are
 * unavailable: they are warned, the save is not refused.
 */
export interface DefenseInUnavailableHalfDay extends HalfDaySlot {
  startMinutes: number;
  studentName: string;
  roomName: string;
}

export interface MyAvailability {
  submittedAt?: string;
  unavailable: HalfDaySlot[];
  defensesInUnavailableHalfDays: DefenseInUnavailableHalfDay[];
}

export interface TeacherAvailability {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  submittedAt?: string;
  unavailable: HalfDaySlot[];
}

export class NoTeacherProfile extends Error {
  constructor(userId: number) {
    super(`Account ${userId} is not linked to a teacher`);
  }
}
