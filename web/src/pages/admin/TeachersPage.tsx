import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { fetchTeachers, saveTeacher } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatDate } from '../../format';
import type { PersonInput } from '../../types';

const EMPTY: PersonInput = { firstName: '', lastName: '', email: '' };

/** The teachers, at /admin/enseignants. Added and edited, never deleted. */
export const TeachersPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: () => fetchTeachers(token!) });
  const [edit, setEdit] = useState<{ id?: number } & PersonInput>(EMPTY);

  const mutation = useMutation({
    mutationFn: () => {
      const { id, ...person } = edit;
      return saveTeacher(person, token!, id);
    },
    onSuccess: () => {
      setEdit(EMPTY);
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
  useLogoutOn401(teachers.error, mutation.error);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <section className="page wide-page">
      <h2>Enseignants</h2>

      <form className="form panel" onSubmit={handleSubmit} aria-label="Enseignant">
        <h3>{edit.id ? 'Modifier l’enseignant' : 'Ajouter un enseignant'}</h3>
        <div className="field">
          <label htmlFor="teacher-first">Prénom</label>
          <input id="teacher-first" value={edit.firstName} onChange={(event) => setEdit({ ...edit, firstName: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="teacher-last">Nom</label>
          <input id="teacher-last" value={edit.lastName} onChange={(event) => setEdit({ ...edit, lastName: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="teacher-email">E-mail</label>
          <input id="teacher-email" type="email" value={edit.email} onChange={(event) => setEdit({ ...edit, email: event.target.value })} required />
        </div>
        {mutation.isError && (
          <ErrorAlert error={mutation.error} messages={{ 409: 'Cette adresse e-mail est déjà utilisée.' }} fallback="Impossible d’enregistrer" />
        )}
        <div className="actions">
          <button className="button" type="submit" disabled={mutation.isPending}>
            Enregistrer
          </button>
          {edit.id && (
            <button className="link-button" type="button" onClick={() => setEdit(EMPTY)}>
              Annuler
            </button>
          )}
        </div>
      </form>

      {teachers.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {teachers.isError && <ErrorAlert error={teachers.error} fallback="Impossible de charger les enseignants" />}
      {teachers.data && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Tuteur de</th>
                <th>Compte</th>
                <th>Disponibilités</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {teachers.data.map((teacher) => (
                <tr key={teacher.id}>
                  <td>
                    {teacher.lastName} {teacher.firstName}
                  </td>
                  <td>{teacher.email}</td>
                  <td>{teacher.tutoredCount} élève(s)</td>
                  <td>{teacher.hasAccount ? 'Oui' : 'Non'}</td>
                  <td>{teacher.availabilitySubmittedAt ? `Saisies le ${formatDate(teacher.availabilitySubmittedAt)}` : 'Non saisies'}</td>
                  <td>
                    <button
                      className="link-button"
                      type="button"
                      aria-label={`Modifier ${teacher.firstName} ${teacher.lastName}`}
                      onClick={() => setEdit({ id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email })}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
