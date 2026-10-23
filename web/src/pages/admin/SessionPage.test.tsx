import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SESSION } from '../../fixtures';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ADMIN' });

describe('SessionPage', () => {
  it('offers to create the session when there is none, with the 4 rooms and C, D closed on Thursday afternoon', async () => {
    fakeApi({ 'GET /session': () => nestError(404, 'No session yet') });
    renderApp('/admin/session', { token });

    expect(await screen.findByRole('heading', { name: 'Créer la session' })).toBeInTheDocument();
    expect(screen.getByLabelText('Salle 1 fermée jeudi après-midi')).not.toBeChecked();
    expect(screen.getByLabelText('Salle 3 fermée jeudi après-midi')).toBeChecked();
    expect(screen.getByLabelText('Salle 4 fermée jeudi après-midi')).toBeChecked();
  });

  it('POSTs the name, the Monday and the rooms', async () => {
    const requests = fakeApi({
      'GET /session': () => nestError(404, 'No session yet'),
      'POST /session': () => Response.json(SESSION, { status: 201 }),
    });
    renderApp('/admin/session', { token });

    await userEvent.type(await screen.findByLabelText('Lundi de la semaine'), '2027-06-21');
    await userEvent.click(screen.getByRole('button', { name: 'Créer la session' }));

    const post = requests.find((request) => request.method === 'POST' && pathOf(request) === '/session')!;
    const body = await post.json();
    expect(body.startDate).toBe('2027-06-21');
    expect(body.rooms).toHaveLength(4);
    expect(body.rooms[2]).toEqual({ name: 'Salle C', videoLink: 'https://visio.castelmont.fr/salle-c', closedThursdayAfternoon: true });
    expect(await screen.findByRole('heading', { name: 'Salles' })).toBeInTheDocument();
  });

  it('says so when the chosen day is not a Monday (422)', async () => {
    fakeApi({ 'GET /session': () => nestError(404, 'No session yet'), 'POST /session': () => nestError(422, 'not a Monday') });
    renderApp('/admin/session', { token });

    await userEvent.type(await screen.findByLabelText('Lundi de la semaine'), '2027-06-22');
    await userEvent.click(screen.getByRole('button', { name: 'Créer la session' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La date choisie n’est pas un lundi.');
  });

  it('shows the week, the 60 slots and the rooms of an existing session', async () => {
    fakeApi({ 'GET /session': () => Response.json(SESSION) });
    renderApp('/admin/session', { token });

    expect(await screen.findByText('du lundi 21 juin au vendredi 25 juin')).toBeInTheDocument();
    expect(screen.getByText('60 créneaux de 40 minutes')).toBeInTheDocument();
    expect(screen.getByLabelText('Salle C fermée jeudi après-midi')).toBeChecked();
  });

  it('PATCHes a room: its video link', async () => {
    const requests = fakeApi({
      'GET /session': () => Response.json(SESSION),
      'PATCH /session/rooms/1': () => Response.json({ ...SESSION.rooms[0], videoLink: 'https://visio.castelmont.fr/a2' }),
    });
    renderApp('/admin/session', { token });

    const link = await screen.findByLabelText('Lien de Salle A');
    await userEvent.clear(link);
    await userEvent.type(link, 'https://visio.castelmont.fr/a2');
    await userEvent.click(screen.getAllByRole('button', { name: 'Enregistrer' })[0]);

    const patch = requests.find((request) => request.method === 'PATCH')!;
    expect(pathOf(patch)).toBe('/session/rooms/1');
    await expect(patch.json()).resolves.toMatchObject({ videoLink: 'https://visio.castelmont.fr/a2' });
  });

  it('locks the change of week once defenses are placed', async () => {
    fakeApi({ 'GET /session': () => Response.json({ ...SESSION, defenseCount: 3 }) });
    renderApp('/admin/session', { token });

    expect(await screen.findByRole('button', { name: 'Changer la semaine' })).toBeDisabled();
    expect(screen.getByText(/Impossible tant que des soutenances sont placées/)).toBeInTheDocument();
  });
});
