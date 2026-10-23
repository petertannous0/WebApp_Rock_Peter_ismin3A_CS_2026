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
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
}

/** What POST /users expects. */
export interface NewAccount {
  role: AccountRole;
  personId: number;
  password: string;
}
