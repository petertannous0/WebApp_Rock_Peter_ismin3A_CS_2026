import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SESSION } from '../../fixtures';
import type { MyAvailability } from '../../types';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ENSEIGNANT' });

const notAnswered: MyAvailability = { unavailable: [], defensesInUnavailableHalfDays: [] };

function api(mine: MyAvailability = notAnswered, saved?: MyAvailability) {
  return fakeApi({
    'GET /session': () => Response.json(SESSION),
    'GET /me/defenses': () => Response.json([]),
    'GET /me/unavailability': () => Response.json(mine),
    'PUT /me/unavailability': () => Response.json(saved ?? { ...mine, submittedAt: '2027-05-12T09:00:00.000Z' }),
  });
}

describe('AvailabilityForm (the teacher)', () => {
  it('shows the 5 days × 2 half-days of the session, and says they have not answered', async () => {
    api();
    renderApp('/enseignant', { token });

    expect(await screen.findByRole('rowheader', { name: 'lundi 21 juin' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    expect(screen.getByText('Vous n’avez pas encore répondu.')).toBeInTheDocument();
  });

  it('starts from the half-days already saved', async () => {
    api({ submittedAt: '2027-05-10T08:00:00.000Z', unavailable: [{ day: '2027-06-24', halfDay: 'AFTERNOON' }], defensesInUnavailableHalfDays: [] });
    renderApp('/enseignant', { token });

    expect(await screen.findByLabelText('Indisponible jeudi 24 juin après-midi')).toBeChecked();
    expect(screen.getByLabelText('Indisponible jeudi 24 juin matin')).not.toBeChecked();
    expect(screen.getByText('Réponse enregistrée le 10/05/2027.')).toBeInTheDocument();
  });

  it('PUTs the ticked half-days, the whole list at once', async () => {
    const requests = api();
    renderApp('/enseignant', { token });

    await userEvent.click(await screen.findByLabelText('Indisponible lundi 21 juin matin'));
    await userEvent.click(screen.getByLabelText('Indisponible jeudi 24 juin après-midi'));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const put = requests.find((request) => request.method === 'PUT' && pathOf(request) === '/me/unavailability')!;
    await expect(put.json()).resolves.toEqual({
      halfDays: [
        { day: '2027-06-21', halfDay: 'MORNING' },
        { day: '2027-06-24', halfDay: 'AFTERNOON' },
      ],
    });
    expect(await screen.findByText('Vos indisponibilités sont enregistrées.')).toBeInTheDocument();
  });

  it('saves an empty list too: available all week is an answer', async () => {
    const requests = api();
    renderApp('/enseignant', { token });

    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    const put = requests.find((request) => request.method === 'PUT')!;
    await expect(put.json()).resolves.toEqual({ halfDays: [] });
  });

  it('warns about a defense already placed in a half-day they tick', async () => {
    api(notAnswered, {
      submittedAt: '2027-05-12T09:00:00.000Z',
      unavailable: [{ day: '2027-06-21', halfDay: 'MORNING' }],
      defensesInUnavailableHalfDays: [{ day: '2027-06-21', halfDay: 'MORNING', startMinutes: 550, studentName: 'Léa Martin', roomName: 'Salle B' }],
    });
    renderApp('/enseignant', { token });

    await userEvent.click(await screen.findByLabelText('Indisponible lundi 21 juin matin'));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('soutenance de Léa Martin, lundi 21 juin à 9 h 10, Salle B');
  });

  it('says so when the session is not created yet', async () => {
    fakeApi({ 'GET /session': () => nestError(404, 'No session yet'), 'GET /me/unavailability': () => Response.json(notAnswered) });
    renderApp('/enseignant', { token });

    expect(await screen.findByText(/pas encore créée/)).toBeInTheDocument();
  });
});
