import type { Role } from '../types';

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  ENSEIGNANT: '/enseignant',
  ELEVE: '/eleve',
};
