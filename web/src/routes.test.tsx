import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { COMPANIES, SESSION, STUDENTS, TEACHERS } from './fixtures';
import type { Role } from './types';
import { fakeApi, makeToken, renderApp } from './test-utils';

const PAGES: [path: string, role: Role, heading: string][] = [
  ['/admin', 'ADMIN', 'Tableau de bord'],
  ['/admin/placement', 'ADMIN', 'Placement des soutenances'],
  ['/admin/tuteurs', 'ADMIN', 'Tuteurs entreprise'],
  ['/admin/session', 'ADMIN', 'Session de soutenances'],
  ['/admin/entreprises', 'ADMIN', 'Entreprises et tuteurs'],
  ['/admin/enseignants', 'ADMIN', 'Enseignants'],
  ['/admin/eleves', 'ADMIN', 'Élèves'],
  ['/admin/disponibilites', 'ADMIN', 'Disponibilités des enseignants'],
  ['/admin/comptes', 'ADMIN', 'Comptes'],
  ['/enseignant', 'ENSEIGNANT', 'Mon espace enseignant'],
  ['/eleve', 'ELEVE', 'Ma soutenance'],
];

const HOME: Record<Role, string> = {
  ADMIN: 'Tableau de bord',
  ENSEIGNANT: 'Mon espace enseignant',
  ELEVE: 'Ma soutenance',
};

const ROLES: Role[] = ['ADMIN', 'ENSEIGNANT', 'ELEVE'];

beforeEach(() => {
  fakeApi({
    'GET /session': () => Response.json(SESSION),
    'GET /defenses': () => Response.json([]),
    'GET /students': () => Response.json(STUDENTS),
    'GET /teachers': () => Response.json(TEACHERS),
    'GET /companies': () => Response.json(COMPANIES),
    'GET /users': () => Response.json([]),
    'GET /availability': () => Response.json([]),
    'GET /company-tutors/schedule': () => Response.json([]),
    'GET /me/defenses': () => Response.json([]),
    'GET /me/defense': () => Response.json({ studentName: 'Léa Martin', defense: null }),
    'GET /me/unavailability': () => Response.json({ unavailable: [], defensesInUnavailableHalfDays: [] }),
  });
});

const heading = (name: string) => screen.findByRole('heading', { level: 2, name });

describe('every page, every role', () => {
  for (const [path, owner, title] of PAGES) {
    it(`${path} is shown to ${owner}`, async () => {
      renderApp(path, { token: makeToken({ role: owner }) });

      expect(await heading(title)).toBeInTheDocument();
    });

    for (const other of ROLES.filter((role) => role !== owner)) {
      it(`${path} sends ${other} to their own home`, async () => {
        renderApp(path, { token: makeToken({ role: other }) });

        expect(await heading(HOME[other])).toBeInTheDocument();
      });
    }

    it(`${path} sends a logged-out visitor to the login`, async () => {
      renderApp(path);

      expect(await heading('Connexion')).toBeInTheDocument();
    });
  }
});
