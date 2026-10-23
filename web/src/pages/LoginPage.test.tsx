import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TOKEN_KEY } from '../auth/AuthProvider';
import type { Role } from '../types';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../test-utils';

async function logInAs(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Adresse e-mail'), email);
  await userEvent.type(screen.getByLabelText('Mot de passe'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}

function apiAnswering(role: Role) {
  return fakeApi({
    'POST /auth/login': () => Response.json({ access_token: makeToken({ role }) }),
    'GET /users': () => Response.json([]),
    'GET /teachers': () => Response.json([]),
  });
}

describe('LoginPage', () => {
  it('sends the email and the password to POST /auth/login', async () => {
    const requests = apiAnswering('ADMIN');
    renderApp('/login');

    await logInAs('admin@castelmont.fr', 'soutenance2027');

    const login = requests.find((request) => request.method === 'POST' && pathOf(request) === '/auth/login');
    await expect(login!.json()).resolves.toEqual({ email: 'admin@castelmont.fr', password: 'soutenance2027' });
  });

  it.each([
    ['ADMIN', 'Tableau de bord'],
    ['ENSEIGNANT', 'Mon espace enseignant'],
    ['ELEVE', 'Ma soutenance'],
  ] as const)('takes %s to their home page once logged in, and keeps the token', async (role, heading) => {
    apiAnswering(role);
    renderApp('/login');

    await logInAs('someone@castelmont.fr', 'soutenance2027');

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
  });

  it('says so on a wrong password, and stays on the page', async () => {
    fakeApi({ 'POST /auth/login': () => nestError(401, 'Wrong email or password') });
    renderApp('/login');

    await logInAs('admin@castelmont.fr', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Adresse e-mail ou mot de passe incorrect.');
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('offers no sign-up: accounts come from the administration', () => {
    renderApp('/login');

    expect(screen.queryByRole('link', { name: /inscri/i })).not.toBeInTheDocument();
    expect(screen.getByText(/créé par la scolarité/)).toBeInTheDocument();
  });

  it('sends an already logged-in user to their home page', () => {
    renderApp('/login', { token: makeToken({ role: 'ELEVE' }) });

    expect(screen.getByRole('heading', { name: 'Ma soutenance' })).toBeInTheDocument();
  });
});
