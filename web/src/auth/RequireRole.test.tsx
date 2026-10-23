import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeApi, makeToken, renderApp } from '../test-utils';

beforeEach(() => {
  fakeApi({
    'GET /users': () => Response.json([]),
    'GET /teachers': () => Response.json([]),
    'POST /auth/login': () => Response.json({ access_token: makeToken({ role: 'ADMIN' }) }),
  });
});

describe('RequireRole', () => {
  it('shows an admin page to the admin', () => {
    renderApp('/admin/comptes', { token: makeToken({ role: 'ADMIN' }) });

    expect(screen.getByRole('heading', { name: 'Comptes' })).toBeInTheDocument();
  });

  it.each([
    ['ENSEIGNANT', 'Mon espace enseignant'],
    ['ELEVE', 'Ma soutenance'],
  ] as const)('sends %s away from an admin page, to their own home', (role, home) => {
    renderApp('/admin/comptes', { token: makeToken({ role }) });

    expect(screen.queryByRole('heading', { name: 'Comptes' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: home })).toBeInTheDocument();
  });

  it("sends a student away from the teacher's page", () => {
    renderApp('/enseignant', { token: makeToken({ role: 'ELEVE' }) });

    expect(screen.getByRole('heading', { name: 'Ma soutenance' })).toBeInTheDocument();
  });

  it('sends a logged-out user to the login page, then back to the page asked for', async () => {
    renderApp('/admin/comptes');
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'admin@castelmont.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'soutenance2027');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('heading', { name: 'Comptes' })).toBeInTheDocument();
  });
});
