import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { ApiError, createSession, fetchSession, updateRoom, updateSession } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDay } from '../../format';
import type { Room, RoomInput, Session } from '../../types';

/** The client's setting: 4 rooms, C and D closed on Thursday afternoon. Editable before creating. */
const DEFAULT_ROOMS: RoomInput[] = ['A', 'B', 'C', 'D'].map((letter) => ({
  name: `Salle ${letter}`,
  videoLink: `https://visio.castelmont.fr/salle-${letter.toLowerCase()}`,
  closedThursdayAfternoon: letter === 'C' || letter === 'D',
}));

/** The session, at /admin/session: created once, then its rooms and its week can be edited. */
export const SessionPage = () => {
  const { token } = useAuth();
  const session = useQuery({ queryKey: ['session'], queryFn: () => fetchSession(token!) });
  useLogoutOn401(session.error);

  const noSession = session.error instanceof ApiError && session.error.status === 404;

  return (
    <section className="page">
      <h2>Session de soutenances</h2>
      {session.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {session.isError && !noSession && <ErrorAlert error={session.error} fallback="Impossible de charger la session" />}
      {noSession && <CreateSessionForm />}
      {session.data && <SessionDetails session={session.data} />}
    </section>
  );
};

const CreateSessionForm = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('Soutenances 3A, juin');
  const [startDate, setStartDate] = useState('');
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);

  const mutation = useMutation({
    mutationFn: () => createSession({ name, startDate, rooms }, token!),
    onSuccess: (created) => queryClient.setQueryData(['session'], created),
  });
  useLogoutOn401(mutation.error);

  const setRoom = (index: number, patch: Partial<RoomInput>) =>
    setRooms(rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)));

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <form className="form panel wide-panel" onSubmit={handleSubmit} aria-label="Créer la session">
      <h3>Créer la session</h3>
      <p className="hint">Une semaine du lundi au vendredi : les 60 créneaux de 40 minutes sont générés automatiquement.</p>

      <div className="field">
        <label htmlFor="session-name">Nom</label>
        <input id="session-name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="session-start">Lundi de la semaine</label>
        <input id="session-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Salle</th>
            <th>Lien de visioconférence</th>
            <th>Fermée jeudi après-midi</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room, i) => (
            <tr key={i}>
              <td>
                <input aria-label={`Nom de la salle ${i + 1}`} value={room.name} onChange={(event) => setRoom(i, { name: event.target.value })} required />
              </td>
              <td>
                <input aria-label={`Lien de la salle ${i + 1}`} type="url" value={room.videoLink} onChange={(event) => setRoom(i, { videoLink: event.target.value })} required />
              </td>
              <td>
                <input
                  aria-label={`Salle ${i + 1} fermée jeudi après-midi`}
                  type="checkbox"
                  checked={room.closedThursdayAfternoon}
                  onChange={(event) => setRoom(i, { closedThursdayAfternoon: event.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mutation.isError && (
        <ErrorAlert
          error={mutation.error}
          messages={{ 409: 'Une session existe déjà.', 422: 'La date choisie n’est pas un lundi.' }}
          fallback="Impossible de créer la session"
        />
      )}
      <button className="button" type="submit" disabled={mutation.isPending}>
        Créer la session
      </button>
    </form>
  );
};

const SessionDetails = ({ session }: { session: Session }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(session.startDate);

  const move = useMutation({
    mutationFn: () => updateSession({ startDate }, token!),
    onSuccess: (updated) => queryClient.setQueryData(['session'], updated),
  });
  useLogoutOn401(move.error);

  const locked = session.defenseCount > 0;

  return (
    <>
      <dl className="detail-fields">
        <div>
          <dt>Nom</dt>
          <dd>{session.name}</dd>
        </div>
        <div>
          <dt>Semaine</dt>
          <dd>
            du {formatDay(session.days[0])} au {formatDay(session.days[session.days.length - 1])}
          </dd>
        </div>
        <div>
          <dt>Créneaux</dt>
          <dd>{session.slots.length} créneaux de 40 minutes</dd>
        </div>
        <div>
          <dt>Soutenances placées</dt>
          <dd>{session.defenseCount}</dd>
        </div>
      </dl>

      <h3>Salles</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Salle</th>
            <th>Lien de visioconférence</th>
            <th>Fermée jeudi après-midi</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {session.rooms.map((room) => (
            <RoomRow key={room.id} room={room} />
          ))}
        </tbody>
      </table>

      <form
        className="form panel"
        aria-label="Changer la semaine"
        onSubmit={(event) => {
          event.preventDefault();
          move.mutate();
        }}
      >
        <h3>Changer la semaine</h3>
        {locked && <p className="hint">Impossible tant que des soutenances sont placées : les créneaux seraient regénérés.</p>}
        <div className="field">
          <label htmlFor="session-move">Lundi de la semaine</label>
          <input id="session-move" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={locked} />
        </div>
        {move.isError && (
          <ErrorAlert
            error={move.error}
            messages={{ 409: 'Des soutenances sont déjà placées.', 422: 'La date choisie n’est pas un lundi.' }}
            fallback="Impossible de changer la semaine"
          />
        )}
        <button className="button" type="submit" disabled={locked || move.isPending || startDate === session.startDate}>
          Changer la semaine
        </button>
      </form>
    </>
  );
};

/** One room, edited in place. Closing it on Thursday afternoon with defenses there is allowed: the grid shows them. */
const RoomRow = ({ room }: { room: Room }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RoomInput>(room);

  const mutation = useMutation({
    mutationFn: () => updateRoom(room.id, draft, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session'] }),
  });
  useLogoutOn401(mutation.error);

  const changed =
    draft.name !== room.name || draft.videoLink !== room.videoLink || draft.closedThursdayAfternoon !== room.closedThursdayAfternoon;

  return (
    <tr>
      <td>
        <input aria-label={`Nom de ${room.name}`} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </td>
      <td>
        <input
          aria-label={`Lien de ${room.name}`}
          type="url"
          value={draft.videoLink}
          onChange={(event) => setDraft({ ...draft, videoLink: event.target.value })}
        />
      </td>
      <td>
        <input
          aria-label={`${room.name} fermée jeudi après-midi`}
          type="checkbox"
          checked={draft.closedThursdayAfternoon}
          onChange={(event) => setDraft({ ...draft, closedThursdayAfternoon: event.target.checked })}
        />
      </td>
      <td>
        <button className="link-button" type="button" disabled={!changed || mutation.isPending} onClick={() => mutation.mutate()}>
          Enregistrer
        </button>
        {mutation.isError && <ErrorAlert error={mutation.error} messages={{ 409: 'Nom déjà pris.' }} fallback="Échec" />}
      </td>
    </tr>
  );
};
