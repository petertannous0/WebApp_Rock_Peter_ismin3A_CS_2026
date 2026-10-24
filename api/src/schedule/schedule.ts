import type { HalfDay } from '../session/slots.js';

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

export class NoProfile extends Error {
  constructor(userId: number) {
    super(`Account ${userId} is not linked to a teacher or a student`);
  }
}
