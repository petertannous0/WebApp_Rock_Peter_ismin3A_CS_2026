import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test-utils';

describe('App, the routes', () => {
  it('shows the home page on /', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument();
  });

  it('shows "Page introuvable" on a URL that no route knows', () => {
    renderApp('/nimporte-quoi');

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('goes back home from the 404 page', async () => {
    renderApp('/nimporte-quoi');

    await userEvent.click(screen.getByRole('link', { name: "Retour à l'accueil" }));

    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument();
  });
});
