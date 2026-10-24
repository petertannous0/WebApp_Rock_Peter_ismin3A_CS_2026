export type Role = 'ADMIN' | 'ENSEIGNANT' | 'ELEVE';

export type AccountRole = 'ENSEIGNANT' | 'ELEVE';

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
  availabilitySubmittedAt?: string;
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
  placed: boolean;
}

export interface NewAccount {
  role: AccountRole;
  personId: number;
  password: string;
}

export type HalfDay = 'MORNING' | 'AFTERNOON';

export interface Room {
  id: number;
  name: string;
  videoLink: string;
  closedThursdayAfternoon: boolean;
}

export interface Slot {
  id: number;
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

export type Severity = 'BLOCKING' | 'WARNING';

export interface Violation {
  rule: string;
  severity: Severity;
  message: string;
}

export interface CheckResult {
  violations: Violation[];
  canSave: boolean;
  needsForce: boolean;
  hint?: string;
}

export interface Proposal {
  studentId: number;
  secondTeacherId: number;
  slotId: number;
  roomId: number;
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
  violations: Violation[];
}

export interface Jury {
  academicTutor: string;
  secondTeacher: string;
  companyTutor: string;
}

export interface When {
  day: string;
  startMinutes: number;
  halfDay: HalfDay;
  roomName: string;
  videoLink: string;
}

export interface TeacherDefense extends When {
  id: number;
  role: 'ACADEMIC_TUTOR' | 'SECOND_TEACHER';
  student: { name: string; companyName: string };
  jury: Jury;
}

export interface StudentSchedule {
  studentName: string;
  defense: (When & { jury: Jury }) | null;
}

export interface CompanyTutorSchedule {
  id: number;
  name: string;
  email: string;
  companyName: string;
  defenses: (When & { studentName: string })[];
}
