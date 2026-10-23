import { useQuery } from '@tanstack/react-query';
import { fetchMyDefenses } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDay, formatTime } from '../../format';
import type { TeacherDefense } from '../../types';

const ROLE_LABELS: Record<TeacherDefense['role'], string> = {
  ACADEMIC_TUTOR: 'tuteur académique',
  SECOND_TEACHER: 'second enseignant',
};

/** The teacher's defenses, day by day (decision P6-a): when, where, whom, and the rest of the jury. */
export const TeacherSchedule = () => {
  const { token } = useAuth();
  const defenses = useQuery({ queryKey: ['my-defenses'], queryFn: () => fetchMyDefenses(token!) });
  useLogoutOn401(defenses.error);

  // Already in time order: grouped by day, keeping that order.
  const days = [...new Set((defenses.data ?? []).map((d) => d.day))];

  return (
    <section className="schedule" aria-label="Mes soutenances">
      <h3>Mes soutenances</h3>
      {defenses.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {defenses.isError && <ErrorAlert error={defenses.error} fallback="Impossible de charger vos soutenances" />}
      {defenses.data?.length === 0 && <p className="hint">Aucune soutenance placée pour l’instant.</p>}
      {days.map((day) => (
        <div key={day} className="schedule-day">
          <h4>{formatDay(day)}</h4>
          <ul className="plain-list">
            {defenses.data!.filter((d) => d.day === day).map((d) => (
              <li key={d.id} className="schedule-item">
                <p>
                  <strong>{formatTime(d.startMinutes)}</strong>, {d.roomName} — soutenance de <strong>{d.student.name}</strong> (
                  {d.student.companyName})
                </p>
                <p>
                  Vous êtes {ROLE_LABELS[d.role]}. Jury : {d.jury.academicTutor} (tuteur académique), {d.jury.secondTeacher} (second
                  enseignant), {d.jury.companyTutor} (tuteur entreprise).
                </p>
                <p>
                  Visioconférence : <a href={d.videoLink}>{d.videoLink}</a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};
