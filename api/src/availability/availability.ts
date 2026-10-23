import type { HalfDay } from '../session/slots.js';

/** A half-day of the session: "2027-06-24" + AFTERNOON. */
export interface HalfDaySlot {
  /** "YYYY-MM-DD" */
  day: string;
  halfDay: HalfDay;
}

/**
 * A defense of the teacher that falls in a half-day they now say they are
 * unavailable: they are warned, the save is not refused (decision P4-c).
 */
export interface DefenseInUnavailableHalfDay extends HalfDaySlot {
  startMinutes: number;
  studentName: string;
  roomName: string;
}

/** What a teacher sees of their own availability. */
export interface MyAvailability {
  /** Absent: they have never saved. */
  submittedAt?: string;
  unavailable: HalfDaySlot[];
  defensesInUnavailableHalfDays: DefenseInUnavailableHalfDay[];
}

/** One line of the admin's overview. */
export interface TeacherAvailability {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  submittedAt?: string;
  unavailable: HalfDaySlot[];
}

/** The account is not linked to a teacher: should not happen for an ENSEIGNANT. */
export class NoTeacherProfile extends Error {
  constructor(userId: number) {
    super(`Account ${userId} is not linked to a teacher`);
  }
}
