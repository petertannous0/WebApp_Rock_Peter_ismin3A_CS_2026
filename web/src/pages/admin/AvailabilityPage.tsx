import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchAvailabilityOverview } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDate, formatShortDay, HALF_DAY_LABELS } from '../../format';

/**
 * Who has entered their availability, at /admin/disponibilites: the list to
 * chase, and each teacher's unavailable half-days. A teacher without an
 * account cannot answer: it says so.
 */
export const AvailabilityPage = () => {
  const { token } = useAuth();
  const overview = useQuery({ queryKey: ['availability'], queryFn: () => fetchAvailabilityOverview(token!) });
  useLogoutOn401(overview.error);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const teachers = overview.data ?? [];
  const answered = teachers.filter((teacher) => teacher.submittedAt).length;
  const shown = onlyMissing ? teachers.filter((teacher) => !teacher.submittedAt) : teachers;

  return (
    <section className="page wide-page">
      <h2>Disponibilités des enseignants</h2>

      {overview.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {overview.isError && <ErrorAlert error={overview.error} fallback="Impossible de charger les disponibilités" />}
      {overview.data && (
        <>
          <p className="summary">
            <strong>
              {answered} / {teachers.length}
            </strong>{' '}
            enseignants ont saisi leurs disponibilités.
          </p>
          <label className="checkbox">
            <input type="checkbox" checked={onlyMissing} onChange={(event) => setOnlyMissing(event.target.checked)} />
            Seulement ceux qui n’ont pas répondu
          </label>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Enseignant</th>
                  <th>E-mail</th>
                  <th>Réponse</th>
                  <th>Indisponible</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((teacher) => (
                  <tr key={teacher.id} className={teacher.submittedAt ? undefined : 'row-missing'}>
                    <td>
                      {teacher.lastName} {teacher.firstName}
                    </td>
                    <td>{teacher.email}</td>
                    <td>
                      {teacher.submittedAt
                        ? `Le ${formatDate(teacher.submittedAt)}`
                        : teacher.hasAccount
                          ? 'Pas encore'
                          : 'Pas encore (pas de compte)'}
                    </td>
                    <td>
                      {teacher.submittedAt && teacher.unavailable.length === 0 && 'Disponible toute la semaine'}
                      {teacher.unavailable.map((h) => (
                        <span key={`${h.day}-${h.halfDay}`} className="chip">
                          {formatShortDay(h.day)} {HALF_DAY_LABELS[h.halfDay]}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
