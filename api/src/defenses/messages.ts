/**
 * The violations, in clear and specific French sentences: who, with whom,
 * when, where. Pure, like the checker: tested on its own.
 *
 * No civility ("M.", "Mme"): the data has none, and guessing it from a first
 * name would be wrong too often. Full names instead.
 */
import type { HalfDay } from '../session/slots.js';
import type { OtherDefense, Violation } from './conflicts.js';

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export function frenchDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

export function frenchTime(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

const HALF_DAY: Record<HalfDay, string> = { MORNING: 'matin', AFTERNOON: 'après-midi' };

function when(other: OtherDefense): string {
  return `le ${frenchDay(other.day)} à ${frenchTime(other.startMinutes)}, ${other.roomName}`;
}

export function describeViolation(violation: Violation): string {
  switch (violation.rule) {
    case 'TEACHER_BUSY':
      return `${violation.teacher.name} est déjà dans le jury de ${violation.other.studentName} ${when(violation.other)}.`;
    case 'TEACHER_UNAVAILABLE':
      return `${violation.teacher.name} a indiqué être indisponible le ${frenchDay(violation.day)} ${HALF_DAY[violation.halfDay]}.`;
    case 'ROOM_TAKEN':
      return (
        `${violation.roomName} est déjà occupée le ${frenchDay(violation.other.day)} à ${frenchTime(violation.other.startMinutes)} ` +
        `par la soutenance de ${violation.other.studentName}.`
      );
    case 'ROOM_CLOSED':
      return `${violation.roomName} est fermée le jeudi après-midi (${frenchDay(violation.day)}).`;
    case 'TEACHER_OVERLOADED':
      return `${violation.teacher.name} aurait ${violation.count} soutenances le ${frenchDay(violation.day)} : 6 au maximum par jour.`;
    case 'COMPANY_TUTOR_BUSY':
      return `${violation.companyTutor.name} (tuteur entreprise) est déjà dans le jury de ${violation.other.studentName} ${when(violation.other)}.`;
    case 'SAME_COMPANY':
      return (
        `${violation.secondTeacher.name} ne peut pas être second enseignant : tuteur académique de ` +
        `${violation.otherStudentName}, de la même entreprise (${violation.companyName}).`
      );
    case 'SECOND_TEACHER_IS_ACADEMIC_TUTOR':
      return `${violation.teacher.name} est déjà le tuteur académique de ${violation.studentName} : choisissez un autre second enseignant.`;
    case 'STUDENT_ALREADY_PLACED':
      return `${violation.studentName} a déjà une soutenance ${when(violation.other)}.`;
  }
}

export function describeCompanyTutorDays(companyTutorName: string, days: string[]): string | undefined {
  if (days.length === 0) return undefined;
  const list = days.map(frenchDay).join(' et le ');
  return `${companyTutorName} vient déjà le ${list} pour une autre soutenance : la placer le même jour lui éviterait un déplacement.`;
}
