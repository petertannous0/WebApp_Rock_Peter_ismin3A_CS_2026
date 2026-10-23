import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { TeacherAvailability } from '../../types';
import { fakeApi, makeToken, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ADMIN' });

const overview: TeacherAvailability[] = [
  {
    id: 7,
    firstName: 'Paul',
    lastName: 'Durand',
    email: 'paul.durand@castelmont.fr',
    hasAccount: true,
    submittedAt: '2027-05-10T08:00:00.000Z',
    unavailable: [{ day: '2027-06-24', halfDay: 'AFTERNOON' }],
  },
  { id: 8, firstName: 'Anna', lastName: 'Roux', email: 'anna.roux@castelmont.fr', hasAccount: true, submittedAt: '2027-05-11T08:00:00.000Z', unavailable: [] },
  { id: 9, firstName: 'Tom', lastName: 'Blanc', email: 'tom.blanc@castelmont.fr', hasAccount: false, unavailable: [] },
];

describe('AvailabilityPage (the admin overview)', () => {
  it('counts who has answered', async () => {
    fakeApi({ 'GET /availability': () => Response.json(overview) });
    renderApp('/admin/disponibilites', { token });

    expect(await screen.findByText('2 / 3')).toBeInTheDocument();
  });

  it('shows the unavailable half-days, and "available all week" for an empty answer', async () => {
    fakeApi({ 'GET /availability': () => Response.json(overview) });
    renderApp('/admin/disponibilites', { token });

    expect(await screen.findByText('jeu. 24 après-midi')).toBeInTheDocument();
    expect(screen.getByText('Disponible toute la semaine')).toBeInTheDocument();
  });

  it('says when a teacher cannot answer: no account', async () => {
    fakeApi({ 'GET /availability': () => Response.json(overview) });
    renderApp('/admin/disponibilites', { token });

    expect(await screen.findByText('Pas encore (pas de compte)')).toBeInTheDocument();
  });

  it('keeps only those who have not answered, on demand', async () => {
    fakeApi({ 'GET /availability': () => Response.json(overview) });
    renderApp('/admin/disponibilites', { token });

    await userEvent.click(await screen.findByLabelText('Seulement ceux qui n’ont pas répondu'));

    expect(screen.queryByText('Durand Paul')).not.toBeInTheDocument();
    expect(screen.getByText('Blanc Tom')).toBeInTheDocument();
  });
});
