import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { checkDefense, createDefense, deleteDefense, moveDefense, refusalOf } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ViolationList } from '../../components/ViolationList';
import { formatDay, formatTime } from '../../format';
import type { Defense, Proposal, Session, Student, Teacher } from '../../types';

export type Selection =
  | { mode: 'place'; studentId?: number; slotId?: number; roomId?: number }
  | { mode: 'move'; defense: Defense };

interface PlacementPanelProps {
  selection: Selection;
  session: Session;
  students: Student[];
  teachers: Teacher[];
  onClose: () => void;
}

/** The form, as the selects give it: strings, '' for "not chosen yet". */
interface Draft {
  studentId: string;
  secondTeacherId: string;
  slotId: string;
  roomId: string;
}

function initialDraft(selection: Selection): Draft {
  if (selection.mode === 'move') {
    const d = selection.defense;
    return { studentId: String(d.student.id), secondTeacherId: String(d.secondTeacher.id), slotId: String(d.slotId), roomId: String(d.roomId) };
  }
  const text = (id?: number) => (id === undefined ? '' : String(id));
  return { studentId: text(selection.studentId), secondTeacherId: '', slotId: text(selection.slotId), roomId: text(selection.roomId) };
}

export const PlacementPanel = ({ selection, session, students, teachers, onClose }: PlacementPanelProps) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(selection));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const moving = selection.mode === 'move' ? selection.defense : undefined;
  const complete = draft.studentId !== '' && draft.secondTeacherId !== '' && draft.slotId !== '' && draft.roomId !== '';
  const proposal: Proposal = {
    studentId: Number(draft.studentId),
    secondTeacherId: Number(draft.secondTeacherId),
    slotId: Number(draft.slotId),
    roomId: Number(draft.roomId),
    ...(moving ? { defenseId: moving.id } : {}),
  };

  const check = useQuery({
    queryKey: ['check', proposal],
    queryFn: () => checkDefense(proposal, token!),
    enabled: complete,
  });

  const done = () => {
    for (const key of ['defenses', 'students', 'session', 'check']) void queryClient.invalidateQueries({ queryKey: [key] });
    onClose();
  };

  const save = useMutation({
    mutationFn: (force: boolean) =>
      moving
        ? moveDefense(moving.id, { slotId: proposal.slotId, roomId: proposal.roomId, secondTeacherId: proposal.secondTeacherId, force }, token!)
        : createDefense({ studentId: proposal.studentId, secondTeacherId: proposal.secondTeacherId, slotId: proposal.slotId, roomId: proposal.roomId, force }, token!),
    onSuccess: done,
  });
  const remove = useMutation({ mutationFn: () => deleteDefense(moving!.id, token!), onSuccess: done });
  useLogoutOn401(check.error, save.error, remove.error);

  const student = students.find((s) => String(s.id) === draft.studentId);
  const choices = moving ? students.filter((s) => s.id === moving.student.id) : students.filter((s) => !s.placed);
  const result = check.data;
  const refusal = refusalOf(save.error);
  const set = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    save.reset();
  };

  return (
    <aside className="panel placement-panel" aria-label={moving ? 'Déplacer la soutenance' : 'Placer une soutenance'}>
      <div className="panel-header">
        <h3>{moving ? `Soutenance de ${moving.student.name}` : 'Placer une soutenance'}</h3>
        <button className="link-button" type="button" onClick={onClose}>
          Fermer
        </button>
      </div>

      {moving && moving.violations.length > 0 && (
        <>
          <p className="hint">Conflits actuels de cette soutenance :</p>
          <ViolationList violations={moving.violations} />
        </>
      )}

      <div className="form">
        <div className="field">
          <label htmlFor="placement-student">Élève</label>
          <select id="placement-student" value={draft.studentId} onChange={(event) => set({ studentId: event.target.value })} disabled={!!moving}>
            <option value="">— Choisir ({choices.length} à placer) —</option>
            {choices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName} {s.firstName} — {s.company.name}
              </option>
            ))}
          </select>
        </div>

        {student && (
          <p className="jury-preview">
            Jury : <strong>{student.academicTutor.name}</strong> (tuteur académique), le second enseignant,{' '}
            <strong>{student.companyTutor.name}</strong> (tuteur entreprise).
          </p>
        )}

        <div className="field">
          <label htmlFor="placement-second">Second enseignant</label>
          <select id="placement-second" value={draft.secondTeacherId} onChange={(event) => set({ secondTeacherId: event.target.value })}>
            <option value="">— Choisir —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.lastName} {t.firstName}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="placement-slot">Créneau</label>
          <select id="placement-slot" value={draft.slotId} onChange={(event) => set({ slotId: event.target.value })}>
            <option value="">— Choisir —</option>
            {session.slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {formatDay(slot.day)}, {formatTime(slot.startMinutes)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="placement-room">Salle</label>
          <select id="placement-room" value={draft.roomId} onChange={(event) => set({ roomId: event.target.value })}>
            <option value="">— Choisir —</option>
            {session.rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
                {room.closedThursdayAfternoon ? ' (fermée le jeudi après-midi)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div aria-live="polite">
          {complete && check.isFetching && (
            <p className="status" role="status">
              Vérification…
            </p>
          )}
          {check.isError && <ErrorAlert error={check.error} fallback="Vérification impossible" />}
          {result && !check.isFetching && result.violations.length === 0 && (
            <p className="success">Aucun conflit : ce placement respecte toutes les règles.</p>
          )}
          {result && !check.isFetching && result.violations.length > 0 && <ViolationList violations={result.violations} />}
          {result?.hint && <p className="info">{result.hint}</p>}
        </div>

        {refusal && (
          <div className="error form-error" role="alert">
            <p>{refusal.canSave ? 'À confirmer :' : 'Placement refusé :'}</p>
            <ViolationList violations={refusal.violations} />
          </div>
        )}
        {save.isError && !refusal && <ErrorAlert error={save.error} fallback="Impossible d’enregistrer" />}

        <div className="actions">
          {(!result || !result.needsForce) && (
            <button className="button" type="button" disabled={!result || !result.canSave || check.isFetching || save.isPending} onClick={() => save.mutate(false)}>
              {moving ? 'Déplacer' : 'Placer la soutenance'}
            </button>
          )}
          {result?.needsForce && (
            <button className="button warning-button" type="button" disabled={check.isFetching || save.isPending} onClick={() => save.mutate(true)}>
              {moving ? 'Déplacer quand même' : 'Placer quand même'}
            </button>
          )}
        </div>

        {moving && (
          <div className="actions danger-zone">
            {!confirmDelete ? (
              <button className="link-button danger" type="button" onClick={() => setConfirmDelete(true)}>
                Supprimer la soutenance
              </button>
            ) : (
              <>
                <span>Supprimer la soutenance de {moving.student.name} ?</span>
                <button className="button danger-button" type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>
                  Confirmer la suppression
                </button>
                <button className="link-button" type="button" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </button>
              </>
            )}
            {remove.isError && <ErrorAlert error={remove.error} fallback="Impossible de supprimer" />}
          </div>
        )}
      </div>
    </aside>
  );
};
