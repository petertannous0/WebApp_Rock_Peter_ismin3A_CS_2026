import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SESSION } from '../fixtures';
import type { CompanyTutorSchedule, StudentSchedule, TeacherDefense } from '../types';
import { fakeApi, makeToken, renderApp } from '../test-utils';

/** F3: each role sees its own schedule. */

const jury = { academicTutor: 'Paul Durand', secondTeacher: 'Anna Roux', companyTutor: 'Jean Roux' };
const salleA = { roomName: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a' };

describe('the teacher sees their defenses, day by day', () => {
  const defenses: TeacherDefense[] = [
    { id: 1, day: '2027-06-21', startMinutes: 510, halfDay: 'MORNING', ...salleA, role: 'ACADEMIC_TUTOR', student: { name: 'Léa Martin', companyName: 'Provence Microsystèmes' }, jury },
    { id: 2, day: '2027-06-21', startMinutes: 550, halfDay: 'MORNING', ...salleA, role: 'SECOND_TEACHER', student: { name: 'Zoé Blanc', companyName: 'Azur Data' }, jury: { ...jury, academicTutor: 'Tom Blanc', secondTeacher: 'Paul Durand' } },
    { id: 3, day: '2027-06-23', startMinutes: 810, halfDay: 'AFTERNOON', ...salleA, role: 'SECOND_TEACHER', student: { name: 'Hugo Petit', companyName: 'Azur Data' }, jury },
  ];

  function api(answer: TeacherDefense[]) {
    fakeApi({
      'GET /me/defenses': () => Response.json(answer),
      'GET /session': () => Response.json(SESSION),
      'GET /me/unavailability': () => Response.json({ unavailable: [], defensesInUnavailableHalfDays: [] }),
    });
  }

  it('groups the defenses under their day, in time order', async () => {
    api(defenses);
    renderApp('/enseignant', { token: makeToken({ role: 'ENSEIGNANT' }) });

    const days = await screen.findAllByRole('heading', { level: 4 });
    expect(days.map((h) => h.textContent)).toEqual(['lundi 21 juin', 'mercredi 23 juin']);
    const schedule = screen.getByRole('region', { name: 'Mes soutenances' });
    expect(within(schedule).getAllByRole('listitem')).toHaveLength(3);
  });

  it('says the time, the room and its link, the student, their role and the whole jury', async () => {
    api(defenses);
    renderApp('/enseignant', { token: makeToken({ role: 'ENSEIGNANT' }) });

    const first = (await screen.findByText('Léa Martin')).closest('li')!;
    expect(first).toHaveTextContent('8 h 30, Salle A — soutenance de Léa Martin (Provence Microsystèmes)');
    expect(first).toHaveTextContent('Vous êtes tuteur académique.');
    expect(first).toHaveTextContent('Paul Durand (tuteur académique), Anna Roux (second enseignant), Jean Roux (tuteur entreprise)');
    expect(within(first).getByRole('link', { name: salleA.videoLink })).toHaveAttribute('href', salleA.videoLink);
    expect(screen.getByText('Zoé Blanc').closest('li')).toHaveTextContent('Vous êtes second enseignant.');
  });

  it('says so when nothing is placed yet', async () => {
    api([]);
    renderApp('/enseignant', { token: makeToken({ role: 'ENSEIGNANT' }) });

    expect(await screen.findByText('Aucune soutenance placée pour l’instant.')).toBeInTheDocument();
  });
});

describe('the student sees their defense', () => {
  const placed: StudentSchedule = { studentName: 'Léa Martin', defense: { day: '2027-06-24', startMinutes: 850, halfDay: 'AFTERNOON', ...salleA, jury } };

  it('shows the date, the time, the room, the link and the jury', async () => {
    fakeApi({ 'GET /me/defense': () => Response.json(placed) });
    renderApp('/eleve', { token: makeToken({ role: 'ELEVE' }) });

    expect(await screen.findByText('jeudi 24 juin')).toBeInTheDocument();
    expect(screen.getByText('14 h 10 à 14 h 50')).toBeInTheDocument();
    expect(screen.getByText('Salle A')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: salleA.videoLink })).toBeInTheDocument();
    expect(screen.getByText('Paul Durand, tuteur académique')).toBeInTheDocument();
    expect(screen.getByText('Anna Roux, second enseignant')).toBeInTheDocument();
    expect(screen.getByText('Jean Roux, tuteur entreprise')).toBeInTheDocument();
  });

  it('says so while the defense is not placed', async () => {
    fakeApi({ 'GET /me/defense': () => Response.json({ studentName: 'Léa Martin', defense: null }) });
    renderApp('/eleve', { token: makeToken({ role: 'ELEVE' }) });

    expect(await screen.findByText(/n’est pas encore planifiée/)).toBeInTheDocument();
  });
});

describe('the admin sees each company tutor, ready to email', () => {
  const tutors: CompanyTutorSchedule[] = [
    {
      id: 5,
      name: 'Jean Roux',
      email: 'jean.roux@provence.fr',
      companyName: 'Provence Microsystèmes',
      defenses: [{ day: '2027-06-21', startMinutes: 510, halfDay: 'MORNING', ...salleA, studentName: 'Léa Martin' }],
    },
    { id: 6, name: 'Inès Faure', email: 'ines.faure@azur.fr', companyName: 'Azur Data', defenses: [] },
  ];
  const token = makeToken({ role: 'ADMIN' });

  it('shows the tutors with a defense, with their text: date, time, student, room link', async () => {
    fakeApi({ 'GET /company-tutors/schedule': () => Response.json(tutors) });
    renderApp('/admin/tuteurs', { token });

    const text = await screen.findByLabelText('Texte pour Jean Roux');
    expect((text as HTMLTextAreaElement).value).toContain('- lundi 21 juin 2027 à 8 h 30 : soutenance de Léa Martin, Salle A');
    expect((text as HTMLTextAreaElement).value).toContain('Lien de visioconférence : https://visio.castelmont.fr/salle-a');
    expect(screen.queryByRole('article', { name: 'Inès Faure' })).not.toBeInTheDocument();
  });

  it('shows the tutors without a defense too, on demand', async () => {
    fakeApi({ 'GET /company-tutors/schedule': () => Response.json(tutors) });
    renderApp('/admin/tuteurs', { token });

    await userEvent.click(await screen.findByLabelText('Seulement ceux qui ont une soutenance placée'));

    expect(within(screen.getByRole('article', { name: 'Inès Faure' })).getByText('Aucune soutenance placée.')).toBeInTheDocument();
  });

  it('copies the text to the clipboard', async () => {
    fakeApi({ 'GET /company-tutors/schedule': () => Response.json(tutors) });
    const writeText = vi.fn().mockResolvedValue(undefined);
    renderApp('/admin/tuteurs', { token });
    const button = await screen.findByRole('button', { name: 'Copier' });
    // After render: userEvent installs its own clipboard on navigator.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await userEvent.click(button);

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('soutenance de Léa Martin'));
    expect(await screen.findByText('Copié')).toBeInTheDocument();
  });
});
