import type { Company, Session, Slot, Student, Teacher } from './types';

/**
 * Data written by hand for the tests, the shape the API answers. The app
 * reads the API: only the tests use them, as the answers of the fake API.
 */

const DAYS = ['2027-06-21', '2027-06-22', '2027-06-23', '2027-06-24', '2027-06-25'];

function slots(): Slot[] {
  const result: Slot[] = [];
  DAYS.forEach((day, dayIndex) => {
    for (let i = 0; i < 12; i++) {
      const morning = i < 6;
      result.push({
        id: dayIndex * 12 + i + 1,
        day,
        dayIndex,
        indexInDay: i,
        startMinutes: (morning ? 510 : 810) + (i % 6) * 40,
        halfDay: morning ? 'MORNING' : 'AFTERNOON',
      });
    }
  });
  return result;
}

export const SESSION: Session = {
  id: 1,
  name: 'Soutenances 3A, juin 2027',
  startDate: '2027-06-21',
  days: DAYS,
  rooms: ['A', 'B', 'C', 'D'].map((letter, i) => ({
    id: i + 1,
    name: `Salle ${letter}`,
    videoLink: `https://visio.castelmont.fr/salle-${letter.toLowerCase()}`,
    closedThursdayAfternoon: letter === 'C' || letter === 'D',
  })),
  slots: slots(),
  defenseCount: 0,
};

export const COMPANIES: Company[] = [
  {
    id: 1,
    name: 'Provence Microsystèmes',
    studentCount: 2,
    tutors: [{ id: 5, firstName: 'Jean', lastName: 'Roux', email: 'jean.roux@provence.fr', companyId: 1, companyName: 'Provence Microsystèmes' }],
  },
  {
    id: 2,
    name: 'Azur Data',
    studentCount: 1,
    tutors: [{ id: 6, firstName: 'Inès', lastName: 'Faure', email: 'ines.faure@azur.fr', companyId: 2, companyName: 'Azur Data' }],
  },
];

export const TEACHERS: Teacher[] = [
  { id: 7, firstName: 'Paul', lastName: 'Durand', email: 'paul.durand@castelmont.fr', hasAccount: true, tutoredCount: 2, availabilitySubmittedAt: '2027-05-10T08:00:00.000Z' },
  { id: 8, firstName: 'Anna', lastName: 'Roux', email: 'anna.roux@castelmont.fr', hasAccount: false, tutoredCount: 1 },
];

export const STUDENTS: Student[] = [
  {
    id: 12,
    firstName: 'Léa',
    lastName: 'Martin',
    email: 'lea.martin@etu.castelmont.fr',
    hasAccount: true,
    company: { id: 1, name: 'Provence Microsystèmes' },
    companyTutor: { id: 5, name: 'Jean Roux', email: 'jean.roux@provence.fr' },
    academicTutor: { id: 7, name: 'Paul Durand' },
    placed: true,
  },
  {
    id: 13,
    firstName: 'Hugo',
    lastName: 'Petit',
    email: 'hugo.petit@etu.castelmont.fr',
    hasAccount: false,
    company: { id: 2, name: 'Azur Data' },
    companyTutor: { id: 6, name: 'Inès Faure', email: 'ines.faure@azur.fr' },
    academicTutor: { id: 8, name: 'Anna Roux' },
    placed: false,
  },
];
