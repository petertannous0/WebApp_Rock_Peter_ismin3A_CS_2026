import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeApi, makeToken, renderApp } from './test-utils';

beforeEach(() => {
  fakeApi({
    'GET /users': () => Response.json([]),
    'GET /teachers': () => Response.json([]),
    'GET /students': () => Response.json([]),
  });
});

describe('App, routing by role', () => {
  it('sends a logged-out visitor from / to the login page', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });

  it.each([
    ['ADMIN', 'Tableau de bord'],
    ['ENSEIGNANT', 'Mon espace enseignant'],
    ['ELEVE', 'Ma soutenance'],
  ] as const)('sends %s from / to their own home page', (role, heading) => {
    renderApp('/', { token: makeToken({ role }) });

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('shows "Page introuvable" on a URL that no route knows', () => {
    renderApp('/nimporte-quoi');

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('treats an expired token as logged out, and forgets it', () => {
    renderApp('/admin', { token: makeToken({ role: 'ADMIN', expired: true }) });

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
