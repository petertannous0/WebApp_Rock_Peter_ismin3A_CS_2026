import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SESSION, STUDENTS, TEACHERS } from '../../fixtures';
import type { CheckResult, Defense, Violation } from '../../types';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ADMIN' });

/** Léa, placed on Monday at 8:30 in room A (slot 1, room 1). Hugo is still to place. */
const leaDefense: Defense = {
  id: 50,
  slotId: 1,
  roomId: 1,
  day: '2027-06-21',
  startMinutes: 510,
  halfDay: 'MORNING',
  roomName: 'Salle A',
  videoLink: 'https://visio.castelmont.fr/salle-a',
  student: { id: 12, name: 'Léa Martin', companyName: 'Provence Microsystèmes' },
  academicTutor: { id: 7, name: 'Paul Durand' },
  secondTeacher: { id: 8, name: 'Anna Roux' },
  companyTutor: { id: 5, name: 'Jean Roux', email: 'jean.roux@provence.fr' },
  violations: [],
};

const busy: Violation = { rule: 'TEACHER_BUSY', severity: 'BLOCKING', message: 'Paul Durand est déjà dans le jury de Léa Martin le lundi 21 juin à 8 h 30, Salle A.' };
const unavailable: Violation = { rule: 'TEACHER_UNAVAILABLE', severity: 'WARNING', message: 'Paul Durand a indiqué être indisponible le lundi 21 juin matin.' };

const clean: CheckResult = { violations: [], canSave: true, needsForce: false };

function api({ defenses = [leaDefense], check = clean }: { defenses?: Defense[]; check?: CheckResult } = {}) {
  return fakeApi({
    'GET /session': () => Response.json(SESSION),
    'GET /defenses': () => Response.json(defenses),
    'GET /students': () => Response.json(STUDENTS),
    'GET /teachers': () => Response.json(TEACHERS),
    'POST /defenses/check': () => Response.json(check),
    'POST /defenses': () => Response.json({ ...leaDefense, id: 51 }, { status: 201 }),
    'PATCH /defenses/50': () => Response.json(leaDefense),
    'DELETE /defenses/50': () => new Response(null, { status: 204 }),
  });
}

/** Opens the panel on Monday 8:30 room B, then picks Hugo and Durand. */
async function placeHugoAt830RoomB() {
  await userEvent.click(await screen.findByRole('button', { name: 'Placer lun. 21 8 h 30, Salle B' }));
  await userEvent.selectOptions(screen.getByLabelText('Élève'), '13');
  await userEvent.selectOptions(screen.getByLabelText('Second enseignant'), '7');
}

const lastBody = async (requests: Request[], method: string, path: string) =>
  requests.filter((r) => r.method === method && pathOf(r) === path).at(-1)!.json();

describe('PlacementPage, the grid', () => {
  it('shows Monday: 12 slots × 4 rooms, the lunch break, and the placed defense with its jury', async () => {
    api();
    renderApp('/admin/placement', { token });

    const grid = await screen.findByRole('table', { name: 'Grille du lundi 21 juin' });
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(12);
    expect(within(grid).getByText('Pause déjeuner, 12 h 30 – 13 h 30')).toBeInTheDocument();
    const cell = within(grid).getByRole('button', { name: 'Soutenance de Léa Martin, lun. 21 8 h 30, Salle A' });
    expect(cell).toHaveTextContent('Paul Durand · Anna Roux');
    expect(within(grid).queryByText('Fermée')).not.toBeInTheDocument();
  });

  it('shows rooms C and D closed on Thursday afternoon only', async () => {
    api();
    renderApp('/admin/placement', { token });

    await userEvent.click(await screen.findByRole('button', { name: /jeudi 24 juin/ }));

    const grid = screen.getByRole('table', { name: 'Grille du jeudi 24 juin' });
    expect(within(grid).getAllByText('Fermée')).toHaveLength(12); // 6 afternoon slots × 2 rooms
    expect(within(grid).getByRole('button', { name: 'Placer jeu. 24 11 h 50, Salle C' })).toBeInTheDocument();
    expect(within(grid).queryByRole('button', { name: 'Placer jeu. 24 13 h 30, Salle C' })).not.toBeInTheDocument();
  });

  it('counts and lists the students still to place', async () => {
    api();
    renderApp('/admin/placement', { token });

    const unplaced = await screen.findByRole('region', { name: 'Élèves à placer' });
    expect(within(unplaced).getByRole('heading', { name: 'Élèves à placer (1)' })).toBeInTheDocument();
    expect(within(unplaced).getByRole('button', { name: 'Petit Hugo' })).toBeInTheDocument();
  });

  it('flags a placed defense that is now in conflict, in the grid and in a banner', async () => {
    api({ defenses: [{ ...leaDefense, violations: [unavailable] }] });
    renderApp('/admin/placement', { token });

    expect(await screen.findByRole('button', { name: 'Soutenance de Léa Martin, lun. 21 8 h 30, Salle A, en conflit' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('1 soutenance(s) placée(s) en conflit');
    expect(screen.getByRole('alert')).toHaveTextContent(unavailable.message);
  });
});

describe('PlacementPage, placing', () => {
  it('pre-fills the slot and the room of the clicked cell, and checks the proposal live', async () => {
    const requests = api();
    renderApp('/admin/placement', { token });

    await placeHugoAt830RoomB();

    expect(screen.getByLabelText('Créneau')).toHaveValue('1');
    expect(screen.getByLabelText('Salle')).toHaveValue('2');
    await expect(lastBody(requests, 'POST', '/defenses/check')).resolves.toEqual({ studentId: 13, secondTeacherId: 7, slotId: 1, roomId: 2 });
    expect(await screen.findByText('Aucun conflit : ce placement respecte toutes les règles.')).toBeInTheDocument();
  });

  it("shows the student's jury: academic tutor and company tutor", async () => {
    api();
    renderApp('/admin/placement', { token });

    await placeHugoAt830RoomB();

    expect(screen.getByText(/Jury :/)).toHaveTextContent('Anna Roux (tuteur académique), le second enseignant, Inès Faure (tuteur entreprise)');
  });

  it('saves a clean placement with POST /defenses, force false', async () => {
    const requests = api();
    renderApp('/admin/placement', { token });

    await placeHugoAt830RoomB();
    await screen.findByText(/Aucun conflit/);
    await userEvent.click(screen.getByRole('button', { name: 'Placer la soutenance' }));

    await expect(lastBody(requests, 'POST', '/defenses')).resolves.toEqual({ studentId: 13, secondTeacherId: 7, slotId: 1, roomId: 2, force: false });
  });

  it('lists the blocking violations before saving, and does not let it save', async () => {
    api({ check: { violations: [busy], canSave: false, needsForce: false } });
    renderApp('/admin/placement', { token });

    await placeHugoAt830RoomB();

    expect(await screen.findByText(busy.message)).toBeInTheDocument();
    expect(screen.getByText('Bloquant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Placer la soutenance' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Placer quand même' })).not.toBeInTheDocument();
  });

  it('offers "Placer quand même" for warnings only, and sends force true', async () => {
    const requests = api({ check: { violations: [unavailable], canSave: true, needsForce: true } });
    renderApp('/admin/placement', { token });

    await placeHugoAt830RoomB();
    expect(await screen.findByText(unavailable.message)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Placer quand même' }));

    await expect(lastBody(requests, 'POST', '/defenses')).resolves.toMatchObject({ force: true });
  });

  it('shows the violations of a refusal (409) when the save itself is refused', async () => {
    fakeApi({
      'GET /session': () => Response.json(SESSION),
      'GET /defenses': () => Response.json([leaDefense]),
      'GET /students': () => Response.json(STUDENTS),
      'GET /teachers': () => Response.json(TEACHERS),
      'POST /defenses/check': () => Response.json(clean),
      // Someone placed another defense in between: the API refuses.
      'POST /defenses': () => Response.json({ statusCode: 409, message: 'Placement refusé', violations: [busy], canSave: false, needsForce: false }, { status: 409 }),
    });
    renderApp('/admin/placement', { token });

    await placeHugoAt830RoomB();
    await screen.findByText(/Aucun conflit/);
    await userEvent.click(screen.getByRole('button', { name: 'Placer la soutenance' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Placement refusé');
    expect(alert).toHaveTextContent(busy.message);
  });

  it('picks a student from the list of those to place', async () => {
    api();
    renderApp('/admin/placement', { token });

    await userEvent.click(await screen.findByRole('button', { name: 'Petit Hugo' }));

    expect(screen.getByLabelText('Élève')).toHaveValue('13');
  });
});

describe('PlacementPage, moving and deleting', () => {
  it('moves a defense: the check carries its id, the save is a PATCH', async () => {
    const requests = api();
    renderApp('/admin/placement', { token });

    await userEvent.click(await screen.findByRole('button', { name: /Soutenance de Léa Martin/ }));
    expect(screen.getByRole('heading', { name: 'Soutenance de Léa Martin' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Créneau'), '2');
    await screen.findByText(/Aucun conflit/);

    await expect(lastBody(requests, 'POST', '/defenses/check')).resolves.toMatchObject({ studentId: 12, slotId: 2, defenseId: 50 });
    await userEvent.click(screen.getByRole('button', { name: 'Déplacer' }));
    await expect(lastBody(requests, 'PATCH', '/defenses/50')).resolves.toEqual({ slotId: 2, roomId: 1, secondTeacherId: 8, force: false });
  });

  it('deletes a defense after a confirmation', async () => {
    const requests = api();
    renderApp('/admin/placement', { token });

    await userEvent.click(await screen.findByRole('button', { name: /Soutenance de Léa Martin/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la soutenance' }));
    expect(requests.some((r) => r.method === 'DELETE')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

    expect(requests.some((r) => r.method === 'DELETE' && pathOf(r) === '/defenses/50')).toBe(true);
  });
});

describe('PlacementPage, before the session exists', () => {
  it('asks to create the session first', async () => {
    fakeApi({
      'GET /session': () => nestError(404, 'No session yet'),
      'GET /defenses': () => nestError(422, 'No session yet'),
      'GET /students': () => Response.json([]),
      'GET /teachers': () => Response.json([]),
    });
    renderApp('/admin/placement', { token });

    expect(await screen.findByText(/Créez d’abord la session/)).toBeInTheDocument();
  });
});
