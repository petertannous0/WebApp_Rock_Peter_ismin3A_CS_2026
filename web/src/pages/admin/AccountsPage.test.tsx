import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TOKEN_KEY } from '../../auth/AuthProvider';
import type { Account, Student, Teacher } from '../../types';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ADMIN' });

const admin: Account = { id: 1, email: 'admin@castelmont.fr', role: 'ADMIN' };
const durand: Teacher = { id: 7, firstName: 'Paul', lastName: 'Durand', email: 'paul.durand@castelmont.fr', hasAccount: false, tutoredCount: 3 };
const roux: Teacher = { id: 8, firstName: 'Anna', lastName: 'Roux', email: 'anna.roux@castelmont.fr', hasAccount: true, tutoredCount: 2 };
const lea: Student = {
  id: 12,
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea.martin@etu.castelmont.fr',
  hasAccount: false,
  company: { id: 1, name: 'Provence Microsystèmes' },
  companyTutor: { id: 5, name: 'Jean Roux', email: 'jean.roux@provence.fr' },
  academicTutor: { id: 7, name: 'Paul Durand' },
  placed: false,
};

function api(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  return fakeApi({
    'GET /users': () => Response.json([admin]),
    'GET /teachers': () => Response.json([durand, roux]),
    'GET /students': () => Response.json([lea]),
    'POST /users': () =>
      Response.json({ id: 3, email: durand.email, role: 'ENSEIGNANT', name: 'Paul Durand', teacherId: 7 }, { status: 201 }),
    ...overrides,
  });
}

async function createFor(personLabel: RegExp, password = 'soutenance2027') {
  await userEvent.selectOptions(await screen.findByLabelText('Personne'), await screen.findByRole('option', { name: personLabel }));
  await userEvent.type(screen.getByLabelText('Mot de passe initial'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Créer le compte' }));
}

describe('AccountsPage', () => {
  it('lists the existing accounts', async () => {
    api();
    renderApp('/admin/comptes', { token });

    expect(await screen.findByRole('cell', { name: 'admin@castelmont.fr' })).toBeInTheDocument();
  });

  it('offers only the teachers who have no account yet', async () => {
    api();
    renderApp('/admin/comptes', { token });

    expect(await screen.findByRole('option', { name: /Durand Paul/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Roux Anna/ })).not.toBeInTheDocument();
  });

  it('switches to the students when the role is Élève', async () => {
    const requests = api();
    renderApp('/admin/comptes', { token });

    await userEvent.selectOptions(screen.getByLabelText('Rôle'), 'ELEVE');

    expect(await screen.findByRole('option', { name: /Martin Léa/ })).toBeInTheDocument();
    expect(requests.map(pathOf)).toContain('/students');
  });

  it('POSTs the role, the person and the password, with the token, then confirms', async () => {
    const requests = api();
    renderApp('/admin/comptes', { token });

    await createFor(/Durand Paul/);

    const post = requests.find((request) => request.method === 'POST' && pathOf(request) === '/users')!;
    expect(post.headers.get('Authorization')).toBe(`Bearer ${token}`);
    await expect(post.json()).resolves.toEqual({ role: 'ENSEIGNANT', personId: 7, password: 'soutenance2027' });
    expect(await screen.findByText('Compte créé pour Paul Durand : identifiant paul.durand@castelmont.fr.')).toBeInTheDocument();
  });

  it('says so when the person already has an account (409)', async () => {
    api({ 'POST /users': () => nestError(409, 'already has an account') });
    renderApp('/admin/comptes', { token });

    await createFor(/Durand Paul/);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cette personne a déjà un compte');
  });

  it('lists what the API explained on a 400', async () => {
    api({ 'POST /users': () => nestError(400, ['password must be longer than or equal to 8 characters']) });
    renderApp('/admin/comptes', { token });

    await createFor(/Durand Paul/, 'whatever-long');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Le formulaire contient des erreurs');
    expect(alert).toHaveTextContent('password must be longer than or equal to 8 characters');
  });

  it('logs out when the API answers 401: the token has expired', async () => {
    api({ 'GET /users': () => nestError(401, 'Invalid or expired token') });
    renderApp('/admin/comptes', { token });

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
