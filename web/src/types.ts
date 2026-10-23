/**
 * The types the API answers: the same shapes as the `*View` / `Account`
 * interfaces of the API. The front and the back speak about the same things.
 */

export type Role = 'ADMIN' | 'ENSEIGNANT' | 'ELEVE';

/** The roles an admin can give an account. */
export type AccountRole = 'ENSEIGNANT' | 'ELEVE';

/** What the user reads, in French. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administration',
  ENSEIGNANT: 'Enseignant',
  ELEVE: 'Élève',
};

export interface Account {
  id: number;
  email: string;
  role: Role;
  name?: string;
  teacherId?: number;
  studentId?: number;
}

export interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  /** When they last saved their unavailability; absent: not answered. */
  availabilitySubmittedAt?: string;
  /** How many students they are the academic tutor of. */
  tutoredCount: number;
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  company: { id: number; name: string };
  companyTutor: { id: number; name: string; email: string };
  academicTutor: { id: number; name: string };
  /** True when their defense is placed. */
  placed: boolean;
}

/** What POST /users expects. */
export interface NewAccount {
  role: AccountRole;
  personId: number;
  password: string;
}

// ─── F1: the session, the people, the availability ─────────────────────────

export type HalfDay = 'MORNING' | 'AFTERNOON';

export interface Room {
  id: number;
  name: string;
  videoLink: string;
  closedThursdayAfternoon: boolean;
}

export interface Slot {
  id: number;
  /** "YYYY-MM-DD" */
  day: string;
  dayIndex: number;
  indexInDay: number;
  /** Minutes since midnight: 510 = 8 h 30 */
  startMinutes: number;
  halfDay: HalfDay;
}

export interface Session {
  id: number;
  name: string;
  startDate: string;
  days: string[];
  rooms: Room[];
  slots: Slot[];
  defenseCount: number;
}

export type RoomInput = Omit<Room, 'id'>;

export interface NewSession {
  name: string;
  startDate: string;
  rooms: RoomInput[];
}

export interface CompanyTutor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyId: number;
  companyName: string;
}

export interface Company {
  id: number;
  name: string;
  studentCount: number;
  tutors: CompanyTutor[];
}

export interface PersonInput {
  firstName: string;
  lastName: string;
  email: string;
}

export interface CompanyTutorInput extends PersonInput {
  companyId: number;
}

export interface StudentInput extends PersonInput {
  companyId: number;
  companyTutorId: number;
  academicTutorId: number;
}

export interface HalfDaySlot {
  day: string;
  halfDay: HalfDay;
}

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

// ─── F2: placement ─────────────────────────────────────────────────────────

export type Severity = 'BLOCKING' | 'WARNING';

/** A broken rule, the way the API sends it: the French sentence is ready. */
export interface Violation {
  rule: string;
  severity: Severity;
  message: string;
}

export interface CheckResult {
  violations: Violation[];
  /** No blocking violation. */
  canSave: boolean;
  /** Only warnings: "save anyway" with force. */
  needsForce: boolean;
  /** Informational: the company tutor already comes on another day. */
  hint?: string;
}

export interface Proposal {
  studentId: number;
  secondTeacherId: number;
  slotId: number;
  roomId: number;
  /** When moving: the defense being moved. */
  defenseId?: number;
}

export interface Defense {
  id: number;
  slotId: number;
  roomId: number;
  day: string;
  startMinutes: number;
  halfDay: HalfDay;
  roomName: string;
  videoLink: string;
  student: { id: number; name: string; companyName: string };
  academicTutor: { id: number; name: string };
  secondTeacher: { id: number; name: string };
  companyTutor: { id: number; name: string; email: string };
  /** Its conflicts now: a teacher may have become unavailable since it was placed. */
  violations: Violation[];
}
