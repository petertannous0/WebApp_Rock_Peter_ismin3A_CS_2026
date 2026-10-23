import { useQuery } from '@tanstack/react-query';
import { fetchMyDefense } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDay, formatTime } from '../../format';

/**
 * The student's defense, at /eleve: slot, room, video link, jury (F3). Names
 * only (decision P6-b). A change is asked to the scolarité, not here.
 */
export const StudentHomePage = () => {
  const { token } = useAuth();
  const schedule = useQuery({ queryKey: ['my-defense'], queryFn: () => fetchMyDefense(token!) });
  useLogoutOn401(schedule.error);

  const defense = schedule.data?.defense;

  return (
    <section className="page">
      <h2>Ma soutenance</h2>
      {schedule.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {schedule.isError && <ErrorAlert error={schedule.error} fallback="Impossible de charger votre soutenance" />}
      {schedule.data && !defense && (
        <p className="hint">Votre soutenance n’est pas encore planifiée. La scolarité la placera prochainement.</p>
      )}
      {defense && (
        <article className="detail">
          <dl className="detail-fields">
            <div>
              <dt>Date</dt>
              <dd>{formatDay(defense.day)}</dd>
            </div>
            <div>
              <dt>Heure</dt>
              <dd>
                {formatTime(defense.startMinutes)} à {formatTime(defense.startMinutes + 40)}
              </dd>
            </div>
            <div>
              <dt>Salle</dt>
              <dd>{defense.roomName}</dd>
            </div>
            <div>
              <dt>Visioconférence</dt>
              <dd>
                <a href={defense.videoLink}>{defense.videoLink}</a>
              </dd>
            </div>
          </dl>
          <h3>Jury</h3>
          <ul className="plain-list">
            <li>{defense.jury.academicTutor}, tuteur académique</li>
            <li>{defense.jury.secondTeacher}, second enseignant</li>
            <li>{defense.jury.companyTutor}, tuteur entreprise</li>
          </ul>
          <p className="hint">20 minutes de présentation, puis 20 minutes de questions. Pour un changement, contactez la scolarité.</p>
        </article>
      )}
    </section>
  );
};
