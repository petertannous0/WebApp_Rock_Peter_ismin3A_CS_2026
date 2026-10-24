import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { ApiError, fetchDefenses, fetchSession, fetchStudents, fetchTeachers } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDay, formatShortDay, formatTime } from '../../format';
import type { Defense, Room, Session, Slot, Student } from '../../types';
import { PlacementPanel, type Selection } from './PlacementPanel';

/** Thursday: dayIndex 3, Monday being 0. Its afternoon, some rooms are closed. */
const THURSDAY = 3;

function isClosed(room: Room, slot: Slot): boolean {
  return room.closedThursdayAfternoon && slot.dayIndex === THURSDAY && slot.halfDay === 'AFTERNOON';
}

/** A key that changes with the selection: the panel starts afresh for each one. */
function selectionKey(selection: Selection): string {
  return selection.mode === 'move'
    ? `move-${selection.defense.id}`
    : `place-${selection.studentId ?? ''}-${selection.slotId ?? ''}-${selection.roomId ?? ''}`;
}

/**
 * The placement grid, at /admin/placement (F2): one day at a time (decision
 * P5-c), 12 slots × the rooms. A click on an empty cell places a defense there;
 * a click on a defense moves or deletes it. The students still to place are
 * listed beside, and the placed defenses that are now in conflict are flagged.
 */
export const PlacementPage = () => {
  const { token } = useAuth();
  const session = useQuery({ queryKey: ['session'], queryFn: () => fetchSession(token!) });
  const defenses = useQuery({ queryKey: ['defenses'], queryFn: () => fetchDefenses(token!) });
  const students = useQuery({ queryKey: ['students'], queryFn: () => fetchStudents(token!) });
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: () => fetchTeachers(token!) });
  useLogoutOn401(session.error, defenses.error, students.error, teachers.error);

  const [dayIndex, setDayIndex] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);

  if (session.error instanceof ApiError && session.error.status === 404) {
    return (
      <section className="page wide-page">
        <h2>Placement des soutenances</h2>
        <p className="hint">Créez d’abord la session : sa semaine, ses salles et ses créneaux.</p>
      </section>
    );
  }
  const error = session.error ?? defenses.error ?? students.error ?? teachers.error;
  if (error) {
    return (
      <section className="page wide-page">
        <h2>Placement des soutenances</h2>
        <ErrorAlert error={error} fallback="Impossible de charger le placement" />
      </section>
    );
  }
  if (!session.data || !defenses.data || !students.data || !teachers.data) {
    return (
      <section className="page wide-page">
        <h2>Placement des soutenances</h2>
        <p className="status" role="status">
          Chargement…
        </p>
      </section>
    );
  }

  const unplaced = students.data.filter((student) => !student.placed);
  const inConflict = defenses.data.filter((defense) => defense.violations.length > 0);

  return (
    <section className="page wide-page">
      <h2>Placement des soutenances</h2>
      <p className="summary">
        <strong>{defenses.data.length}</strong> soutenance(s) placée(s), <strong>{unplaced.length}</strong> élève(s) à placer.
      </p>

      {inConflict.length > 0 && (
        <div className="warning" role="alert">
          <p>
            <strong>{inConflict.length} soutenance(s) placée(s) en conflit</strong> depuis leur placement :
          </p>
          <ul>
            {inConflict.map((defense) => (
              <li key={defense.id}>
                <button className="link-button" type="button" onClick={() => {
                  setDayIndex(session.data.days.indexOf(defense.day));
                  setSelection({ mode: 'move', defense });
                }}>
                  {defense.student.name}, {formatDay(defense.day)} à {formatTime(defense.startMinutes)}, {defense.roomName}
                </button>{' '}
                — {defense.violations.map((v) => v.message).join(' ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <nav className="filters" aria-label="Jours">
        {session.data.days.map((day, i) => (
          <button key={day} className="filter" type="button" aria-pressed={i === dayIndex} onClick={() => setDayIndex(i)}>
            {formatDay(day)} ({defenses.data.filter((d) => d.day === day).length})
          </button>
        ))}
      </nav>

      <div className="placement-layout">
        <DayGrid session={session.data} dayIndex={dayIndex} defenses={defenses.data} onSelect={setSelection} />

        <div className="placement-side">
          {selection && (
            <PlacementPanel
              key={selectionKey(selection)}
              selection={selection}
              session={session.data}
              students={students.data}
              teachers={teachers.data}
              onClose={() => setSelection(null)}
            />
          )}
          <UnplacedList
            students={unplaced}
            onPick={(student) =>
              setSelection(selection?.mode === 'place' ? { ...selection, studentId: student.id } : { mode: 'place', studentId: student.id })
            }
          />
        </div>
      </div>
    </section>
  );
};

interface DayGridProps {
  session: Session;
  dayIndex: number;
  defenses: Defense[];
  onSelect: (selection: Selection) => void;
}

/** One day: a row per slot, a column per room, the lunch break between the half-days. */
const DayGrid = ({ session, dayIndex, defenses, onSelect }: DayGridProps) => {
  const slots = session.slots.filter((slot) => slot.dayIndex === dayIndex);
  const at = (slot: Slot, room: Room) => defenses.find((d) => d.slotId === slot.id && d.roomId === room.id);

  return (
    <div className="table-scroll">
      <table className="table placement-grid" aria-label={`Grille du ${formatDay(session.days[dayIndex])}`}>
        <thead>
          <tr>
            <th>Créneau</th>
            {session.rooms.map((room) => (
              <th key={room.id}>{room.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <Fragment key={slot.id}>
              {slot.indexInDay === 6 && (
                <tr className="lunch">
                  <td colSpan={session.rooms.length + 1}>Pause déjeuner, 12 h 30 – 13 h 30</td>
                </tr>
              )}
              <tr>
                <th scope="row">{formatTime(slot.startMinutes)}</th>
                {session.rooms.map((room) => {
                  const defense = at(slot, room);
                  const where = `${formatShortDay(slot.day)} ${formatTime(slot.startMinutes)}, ${room.name}`;
                  if (defense) {
                    const conflict = defense.violations.length > 0;
                    return (
                      <td key={room.id}>
                        <button
                          type="button"
                          className={conflict ? 'defense-cell conflict' : 'defense-cell'}
                          aria-label={`Soutenance de ${defense.student.name}, ${where}${conflict ? ', en conflit' : ''}`}
                          onClick={() => onSelect({ mode: 'move', defense })}
                        >
                          <strong>
                            {conflict && '⚠ '}
                            {defense.student.name}
                          </strong>
                          <small>
                            {defense.academicTutor.name} · {defense.secondTeacher.name}
                          </small>
                        </button>
                      </td>
                    );
                  }
                  if (isClosed(room, slot)) {
                    return (
                      <td key={room.id} className="closed-cell">
                        Fermée
                      </td>
                    );
                  }
                  return (
                    <td key={room.id}>
                      <button
                        type="button"
                        className="empty-cell"
                        aria-label={`Placer ${where}`}
                        onClick={() => onSelect({ mode: 'place', slotId: slot.id, roomId: room.id })}
                      >
                        +
                      </button>
                    </td>
                  );
                })}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** The students still to place, highlighted beside the grid. A click picks one for the panel. */
const UnplacedList = ({ students, onPick }: { students: Student[]; onPick: (student: Student) => void }) => {
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const shown = students.filter((s) => `${s.firstName} ${s.lastName} ${s.company.name}`.toLowerCase().includes(needle));

  return (
    <section className="panel unplaced" aria-label="Élèves à placer">
      <h3>Élèves à placer ({students.length})</h3>
      {students.length === 0 ? (
        <p className="success">Tous les élèves ont une soutenance.</p>
      ) : (
        <>
          <input
            type="search"
            aria-label="Rechercher un élève à placer"
            placeholder="Nom, entreprise…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ul className="plain-list unplaced-list">
            {shown.map((student) => (
              <li key={student.id}>
                <button className="link-button" type="button" onClick={() => onPick(student)}>
                  {student.lastName} {student.firstName}
                </button>
                <small> {student.company.name}</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
