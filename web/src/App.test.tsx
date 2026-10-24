import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('App, the API down', () => {
  const unreachable = () => {
    throw new TypeError('Failed to fetch');
  };

  it('shows the "service indisponible" page in place of every page while /health cannot be reached', async () => {
    fakeApi({ 'GET /health': unreachable });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Service indisponible' })).toBeInTheDocument();
    expect(screen.getByText('😢')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Connexion' })).not.toBeInTheDocument();
  });

  it('checks /health at once when a request of a page cannot reach the API', async () => {
    let up = true;
    fakeApi({
      'GET /health': () => (up ? Response.json({ status: 'ok' }) : unreachable()),
      'GET /students': () => {
        up = false;
        return unreachable();
      },
    });
    renderApp('/admin/eleves', { token: makeToken({ role: 'ADMIN' }) });

    expect(await screen.findByRole('heading', { name: 'Service indisponible' })).toBeInTheDocument();
  });

  it('brings the page back once the API answers again', async () => {
    let up = false;
    fakeApi({ 'GET /health': () => (up ? Response.json({ status: 'ok' }) : unreachable()) });
    renderApp('/');
    await screen.findByRole('heading', { name: 'Service indisponible' });

    up = true;
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });
});
