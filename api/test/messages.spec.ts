import type { Violation } from '../src/defenses/conflicts.js';
import { describeCompanyTutorDays, describeViolation, frenchDay, frenchTime } from '../src/defenses/messages.js';

const durand = { id: 1, name: 'Paul Durand' };
const atLea = { studentName: 'Léa Martin', day: '2027-06-21', startMinutes: 550, roomName: 'Salle B' };

describe('describeViolation: one clear French sentence per rule', () => {
  const cases: [Violation, string][] = [
    [{ rule: 'TEACHER_BUSY', teacher: durand, other: atLea }, 'Paul Durand est déjà dans le jury de Léa Martin le lundi 21 juin à 9 h 10, Salle B.'],
    [
      { rule: 'TEACHER_UNAVAILABLE', teacher: durand, day: '2027-06-24', halfDay: 'AFTERNOON' },
      'Paul Durand a indiqué être indisponible le jeudi 24 juin après-midi.',
    ],
    [{ rule: 'ROOM_TAKEN', roomName: 'Salle B', other: atLea }, 'Salle B est déjà occupée le lundi 21 juin à 9 h 10 par la soutenance de Léa Martin.'],
    [{ rule: 'ROOM_CLOSED', roomName: 'Salle C', day: '2027-06-24' }, 'Salle C est fermée le jeudi après-midi (jeudi 24 juin).'],
    [
      { rule: 'TEACHER_OVERLOADED', teacher: durand, day: '2027-06-21', count: 7 },
      'Paul Durand aurait 7 soutenances le lundi 21 juin : 6 au maximum par jour.',
    ],
    [
      { rule: 'COMPANY_TUTOR_BUSY', companyTutor: { id: 10, name: 'Jean Roux' }, other: atLea },
      'Jean Roux (tuteur entreprise) est déjà dans le jury de Léa Martin le lundi 21 juin à 9 h 10, Salle B.',
    ],
    [
      { rule: 'SAME_COMPANY', secondTeacher: { id: 2, name: 'Anna Roux' }, otherStudentName: 'Hugo Petit', companyName: 'Provence Microsystèmes' },
      'Anna Roux ne peut pas être second enseignant : tuteur académique de Hugo Petit, de la même entreprise (Provence Microsystèmes).',
    ],
    [
      { rule: 'SECOND_TEACHER_IS_ACADEMIC_TUTOR', teacher: durand, studentName: 'Léa Martin' },
      'Paul Durand est déjà le tuteur académique de Léa Martin : choisissez un autre second enseignant.',
    ],
    [{ rule: 'STUDENT_ALREADY_PLACED', studentName: 'Léa Martin', other: atLea }, 'Léa Martin a déjà une soutenance le lundi 21 juin à 9 h 10, Salle B.'],
  ];

  it.each(cases)('%o', (violation, sentence) => {
    expect(describeViolation(violation)).toBe(sentence);
  });

  it('covers the 9 rules', () => {
    expect(new Set(cases.map(([violation]) => violation.rule)).size).toBe(9);
  });
});

describe('French dates and times', () => {
  it('writes the days in UTC, so that a June day stays that day', () => {
    expect(frenchDay('2027-06-25')).toBe('vendredi 25 juin');
  });

  it('writes the times like the client: "9 h 10", "13 h 30"', () => {
    expect(frenchTime(550)).toBe('9 h 10');
    expect(frenchTime(810)).toBe('13 h 30');
  });
});

describe('describeCompanyTutorDays', () => {
  it('says nothing when the tutor comes no other day', () => {
    expect(describeCompanyTutorDays('Jean Roux', [])).toBeUndefined();
  });

  it('names the other days', () => {
    expect(describeCompanyTutorDays('Jean Roux', ['2027-06-23', '2027-06-24'])).toBe(
      'Jean Roux vient déjà le mercredi 23 juin et le jeudi 24 juin pour une autre soutenance : la placer le même jour lui éviterait un déplacement.',
    );
  });
});
