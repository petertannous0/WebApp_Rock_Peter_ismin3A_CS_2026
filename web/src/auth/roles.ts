import type { Role } from '../types';

/** The home page of each role: where the login, and `/`, lead. */
export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  ENSEIGNANT: '/enseignant',
  ELEVE: '/eleve',
};
