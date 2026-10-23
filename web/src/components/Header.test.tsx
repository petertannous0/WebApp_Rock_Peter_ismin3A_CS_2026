import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TOKEN_KEY } from '../auth/AuthProvider';
import { fakeApi, makeToken, renderApp } from '../test-utils';

beforeEach(() => {
  fakeApi({ 'GET /users': () => Response.json([]), 'GET /teachers': () => Response.json([]) });
});

function navLinks(): string[] {
  const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '');
}

describe('Header', () => {
  it('shows no navigation when logged out', () => {
    renderApp('/login');

    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument();
  });

  it('shows the admin links to the admin only', () => {
    renderApp('/admin', { token: makeToken({ role: 'ADMIN' }) });

    expect(navLinks()).toEqual(['Tableau de bord', 'Session', 'Entreprises', 'Enseignants', 'Élèves', 'Disponibilités', 'Comptes']);
  });

  it('shows no admin link to a teacher', () => {
    renderApp('/enseignant', { token: makeToken({ role: 'ENSEIGNANT' }) });

    expect(navLinks()).not.toContain('Comptes');
  });

  it('shows who is logged in, with the role, from the token', () => {
    renderApp('/eleve', { token: makeToken({ role: 'ELEVE', email: 'lea.martin@etu.castelmont.fr' }) });

    expect(screen.getByText('lea.martin@etu.castelmont.fr · Élève')).toBeInTheDocument();
  });

  it('logs out on a click on "Se déconnecter"', async () => {
    renderApp('/admin', { token: makeToken({ role: 'ADMIN' }) });

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
