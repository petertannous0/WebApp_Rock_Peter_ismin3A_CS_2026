import type { Role } from '../generated/prisma/enums.js';

/** The roles an admin can give: teacher and student. The admin account comes from the seed. */
export const ACCOUNT_ROLES = ['ENSEIGNANT', 'ELEVE'] as const satisfies readonly Role[];
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export interface Account {
  id: number;
  email: string;
  role: Role;
  name?: string;
  teacherId?: number;
  studentId?: number;
}

export class PersonNotFound extends Error {
  constructor(role: AccountRole, id: number) {
    super(`${role === 'ENSEIGNANT' ? 'Teacher' : 'Student'} ${id} not found`);
  }
}

export class PersonAlreadyHasAccount extends Error {
  constructor(email: string) {
    super(`${email} already has an account`);
  }
}

export class EmailAlreadyUsed extends Error {
  constructor(email: string) {
    super(`Email ${email} is already used by another account`);
  }
}
