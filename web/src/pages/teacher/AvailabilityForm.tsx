import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type SubmitEvent } from 'react';
import { ApiError, fetchMyAvailability, fetchSession, saveMyAvailability } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDate, formatDay, formatTime, HALF_DAY_LABELS } from '../../format';
import type { HalfDay, HalfDaySlot } from '../../types';

const HALF_DAYS: HalfDay[] = ['MORNING', 'AFTERNOON'];
const key = (day: string, halfDay: HalfDay) => `${day}|${halfDay}`;

export const AvailabilityForm = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ['session'], queryFn: () => fetchSession(token!) });
  const mine = useQuery({ queryKey: ['my-availability'], queryFn: () => fetchMyAvailability(token!) });

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mine.data) setChecked(new Set(mine.data.unavailable.map((h) => key(h.day, h.halfDay))));
  }, [mine.data]);

  const mutation = useMutation({
    mutationFn: () => {
      const halfDays: HalfDaySlot[] = [...checked].map((k) => {
        const [day, halfDay] = k.split('|');
        return { day, halfDay: halfDay as HalfDay };
      });
      return saveMyAvailability(halfDays, token!);
    },
    onSuccess: (answer) => {
      queryClient.setQueryData(['my-availability'], answer);
      setSaved(true);
    },
  });
  useLogoutOn401(session.error, mine.error, mutation.error);

  const toggle = (k: string) => {
    const next = new Set(checked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setChecked(next);
    setSaved(false);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  if (session.isPending || mine.isPending) {
    return (
      <p className="status" role="status">
        Chargement…
      </p>
    );
  }
  if (session.error instanceof ApiError && session.error.status === 404) {
    return <p className="hint">La session de soutenances n’est pas encore créée par la scolarité.</p>;
  }
  if (session.isError || mine.isError) {
    return <ErrorAlert error={session.error ?? mine.error} fallback="Impossible de charger vos disponibilités" />;
  }

  const answer = mine.data;
  return (
    <form className="form panel wide-panel" onSubmit={handleSubmit} aria-label="Mes indisponibilités">
      <h3>Mes indisponibilités</h3>
      <p className="hint">
        Cochez les demi-journées où vous n’êtes <strong>pas</strong> disponible, puis enregistrez. Si vous êtes disponible
        toute la semaine, enregistrez sans rien cocher.
      </p>
      <p className={answer.submittedAt ? 'success' : 'hint'} role="status">
        {answer.submittedAt ? `Réponse enregistrée le ${formatDate(answer.submittedAt)}.` : 'Vous n’avez pas encore répondu.'}
      </p>

      <div className="table-scroll">
        <table className="table availability-grid">
          <thead>
            <tr>
              <th>Jour</th>
              {HALF_DAYS.map((halfDay) => (
                <th key={halfDay}>{HALF_DAY_LABELS[halfDay]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.data.days.map((day) => (
              <tr key={day}>
                <th scope="row">{formatDay(day)}</th>
                {HALF_DAYS.map((halfDay) => {
                  const k = key(day, halfDay);
                  return (
                    <td key={halfDay} className={checked.has(k) ? 'cell-unavailable' : undefined}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          aria-label={`Indisponible ${formatDay(day)} ${HALF_DAY_LABELS[halfDay]}`}
                          checked={checked.has(k)}
                          onChange={() => toggle(k)}
                        />
                        Indisponible
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {answer.defensesInUnavailableHalfDays.length > 0 && (
        <div className="warning" role="alert">
          <p>Attention, vous êtes déjà dans un jury pendant une demi-journée cochée :</p>
          <ul>
            {answer.defensesInUnavailableHalfDays.map((d) => (
              <li key={`${d.day}-${d.startMinutes}`}>
                soutenance de {d.studentName}, {formatDay(d.day)} à {formatTime(d.startMinutes)}, {d.roomName}
              </li>
            ))}
          </ul>
          <p>La scolarité verra ce conflit sur sa grille de placement.</p>
        </div>
      )}
      {mutation.isError && <ErrorAlert error={mutation.error} messages={{ 422: 'Un jour coché ne fait pas partie de la session.' }} fallback="Impossible d’enregistrer" />}
      {saved && <p className="success">Vos indisponibilités sont enregistrées.</p>}

      <button className="button" type="submit" disabled={mutation.isPending}>
        Enregistrer
      </button>
    </form>
  );
};
