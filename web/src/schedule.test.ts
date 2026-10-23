import { describe, expect, it } from 'vitest';
import { companyTutorEmailText } from './schedule';
import type { CompanyTutorSchedule } from './types';

const jean: CompanyTutorSchedule = {
  id: 5,
  name: 'Jean Roux',
  email: 'jean.roux@provence.fr',
  companyName: 'Provence Microsystèmes',
  defenses: [
    { day: '2027-06-21', startMinutes: 510, halfDay: 'MORNING', roomName: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a', studentName: 'Léa Martin' },
    { day: '2027-06-21', startMinutes: 550, halfDay: 'MORNING', roomName: 'Salle B', videoLink: 'https://visio.castelmont.fr/salle-b', studentName: 'Hugo Petit' },
  ],
};

describe('companyTutorEmailText', () => {
  it('lists each defense: date with the year, time, student, room and its video link', () => {
    expect(companyTutorEmailText(jean)).toBe(
      [
        'Bonjour,',
        '',
        'Voici les soutenances de stage pour lesquelles vous faites partie du jury, à l’École d’ingénieurs de Castelmont :',
        '',
        '- lundi 21 juin 2027 à 8 h 30 : soutenance de Léa Martin, Salle A',
        '  Lien de visioconférence : https://visio.castelmont.fr/salle-a',
        '- lundi 21 juin 2027 à 9 h 10 : soutenance de Hugo Petit, Salle B',
        '  Lien de visioconférence : https://visio.castelmont.fr/salle-b',
        '',
        'Chaque soutenance dure 40 minutes : 20 minutes de présentation, puis 20 minutes de questions.',
        '',
        'Cordialement,',
        'La scolarité',
      ].join('\n'),
    );
  });

  it('speaks of one defense in the singular', () => {
    expect(companyTutorEmailText({ ...jean, defenses: [jean.defenses[0]] })).toContain('Voici la soutenance de stage pour laquelle');
  });
});
