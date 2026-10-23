import type { HalfDay } from '../session/slots.js';

/** The three people of a jury, by name. */
export interface Jury {
  academicTutor: string;
  secondTeacher: string;
  companyTutor: string;
}

/** Where and when: what everybody needs to come. */
export interface When {
  /** "YYYY-MM-DD" */
  day: string;
  startMinutes: number;
  halfDay: HalfDay;
  roomName: string;
  videoLink: string;
}

/** A defense in a teacher's schedule: their role in it, and the rest of the jury. */
export interface TeacherDefense extends When {
  id: number;
  role: 'ACADEMIC_TUTOR' | 'SECOND_TEACHER';
  student: { name: string; companyName: string };
  jury: Jury;
}

/** A student's own defense; `defense` is null while it is not placed. */
export interface StudentSchedule {
  studentName: string;
  defense: (When & { jury: Jury }) | null;
}

/** A company tutor's defenses, for the admin to send them by email (they have no account). */
export interface CompanyTutorSchedule {
  id: number;
  name: string;
  email: string;
  companyName: string;
  defenses: (When & { studentName: string })[];
}

/** The account is not linked to a teacher or a student: should not happen for these roles. */
export class NoProfile extends Error {
  constructor(userId: number) {
    super(`Account ${userId} is not linked to a teacher or a student`);
  }
}
