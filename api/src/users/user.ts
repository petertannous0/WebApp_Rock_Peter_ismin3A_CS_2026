import type { Role } from '../generated/prisma/enums.js';

/** The roles an admin can give: teacher and student. The admin account comes from the seed. */
export const ACCOUNT_ROLES = ['ENSEIGNANT', 'ELEVE'] as const satisfies readonly Role[];
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/** An account, the way the API exposes it: never the password hash. */
export interface Account {
  id: number;
  email: string;
  role: Role;
  /** "Prénom Nom" of the teacher or student; absent for the admin. */
  name?: string;
  teacherId?: number;
  studentId?: number;
}

/** Thrown when the teacher or student the account is for does not exist. */
export class PersonNotFound extends Error {
  constructor(role: AccountRole, id: number) {
    super(`${role === 'ENSEIGNANT' ? 'Teacher' : 'Student'} ${id} not found`);
  }
}

/** Thrown when the teacher or student already has an account. */
export class PersonAlreadyHasAccount extends Error {
  constructor(email: string) {
    super(`${email} already has an account`);
  }
}

/** Thrown when another account already uses this email. */
export class EmailAlreadyUsed extends Error {
  constructor(email: string) {
    super(`Email ${email} is already used by another account`);
  }
}
