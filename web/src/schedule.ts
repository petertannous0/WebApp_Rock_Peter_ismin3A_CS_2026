import { formatDayWithYear, formatTime } from './format';
import type { CompanyTutorSchedule } from './types';

/**
 * The text the admin pastes into an email to a company tutor (they have no
 * account, and the app sends no email). Pure: tested on its own.
 *
 * "Bonjour," with no civility: the data has none (decision P5-d).
 */
export function companyTutorEmailText(tutor: CompanyTutorSchedule): string {
  const lines = tutor.defenses.map(
    (d) =>
      `- ${formatDayWithYear(d.day)} à ${formatTime(d.startMinutes)} : soutenance de ${d.studentName}, ${d.roomName}\n` +
      `  Lien de visioconférence : ${d.videoLink}`,
  );
  const intro =
    tutor.defenses.length === 1
      ? 'Voici la soutenance de stage pour laquelle vous faites partie du jury, à l’École d’ingénieurs de Castelmont :'
      : 'Voici les soutenances de stage pour lesquelles vous faites partie du jury, à l’École d’ingénieurs de Castelmont :';

  return [
    'Bonjour,',
    '',
    intro,
    '',
    ...lines,
    '',
    'Chaque soutenance dure 40 minutes : 20 minutes de présentation, puis 20 minutes de questions.',
    '',
    'Cordialement,',
    'La scolarité',
  ].join('\n');
}
