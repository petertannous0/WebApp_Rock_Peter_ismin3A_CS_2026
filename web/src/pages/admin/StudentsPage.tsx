import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { fetchCompanies, fetchStudents, fetchTeachers, saveStudent } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { Student } from '../../types';

/** The form, as the inputs give it: strings, even for the ids of the selects. */
interface Draft {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  companyId: string;
  companyTutorId: string;
  academicTutorId: string;
}

const EMPTY: Draft = { firstName: '', lastName: '', email: '', companyId: '', companyTutorId: '', academicTutorId: '' };

function toDraft(student: Student): Draft {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    companyId: String(student.company.id),
    companyTutorId: String(student.companyTutor.id),
    academicTutorId: String(student.academicTutor.id),
  };
}

/**
 * The students, at /admin/eleves. Each one has a company, a tutor of that
 * company, and an academic tutor: the first two members of their jury.
 */
export const StudentsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const students = useQuery({ queryKey: ['students'], queryFn: () => fetchStudents(token!) });
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => fetchCompanies(token!) });
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: () => fetchTeachers(token!) });

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [search, setSearch] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const { id, companyId, companyTutorId, academicTutorId, ...person } = draft;
      const input = { ...person, companyId: Number(companyId), companyTutorId: Number(companyTutorId), academicTutorId: Number(academicTutorId) };
      return saveStudent(input, token!, id);
    },
    onSuccess: () => {
      setDraft(EMPTY);
      for (const key of ['students', 'companies', 'teachers']) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
  useLogoutOn401(students.error, companies.error, teachers.error, mutation.error);

  // Only the tutors of the chosen company: the API refuses the others anyway.
  const tutors = companies.data?.find((company) => String(company.id) === draft.companyId)?.tutors ?? [];

  const needle = search.trim().toLowerCase();
  const shown = (students.data ?? []).filter((student) =>
    `${student.firstName} ${student.lastName} ${student.company.name} ${student.academicTutor.name}`.toLowerCase().includes(needle),
  );

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <section className="page">
      <h2>Élèves</h2>

      <form className="form panel" onSubmit={handleSubmit} aria-label="Élève">
        <h3>{draft.id ? 'Modifier l’élève' : 'Ajouter un élève'}</h3>
        <div className="field">
          <label htmlFor="student-first">Prénom</label>
          <input id="student-first" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="student-last">Nom</label>
          <input id="student-last" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="student-email">E-mail</label>
          <input id="student-email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="student-company">Entreprise</label>
          <select
            id="student-company"
            value={draft.companyId}
            onChange={(event) => setDraft({ ...draft, companyId: event.target.value, companyTutorId: '' })}
            required
          >
            <option value="">— Choisir —</option>
            {companies.data?.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="student-tutor">Tuteur entreprise</label>
          <select id="student-tutor" value={draft.companyTutorId} onChange={(event) => setDraft({ ...draft, companyTutorId: event.target.value })} required>
            <option value="">{draft.companyId ? '— Choisir —' : '— Choisir d’abord l’entreprise —'}</option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.firstName} {tutor.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="student-academic">Tuteur académique</label>
          <select id="student-academic" value={draft.academicTutorId} onChange={(event) => setDraft({ ...draft, academicTutorId: event.target.value })} required>
            <option value="">— Choisir —</option>
            {teachers.data?.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.lastName} {teacher.firstName} ({teacher.tutoredCount} élève(s))
              </option>
            ))}
          </select>
        </div>
        {mutation.isError && (
          <ErrorAlert
            error={mutation.error}
            messages={{
              409: 'Cette adresse e-mail est déjà utilisée.',
              422: 'Le tuteur choisi ne travaille pas dans cette entreprise, ou une référence est inconnue.',
            }}
            fallback="Impossible d’enregistrer"
          />
        )}
        <div className="actions">
          <button className="button" type="submit" disabled={mutation.isPending}>
            Enregistrer
          </button>
          {draft.id && (
            <button className="link-button" type="button" onClick={() => setDraft(EMPTY)}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="field search">
        <label htmlFor="student-search">Rechercher</label>
        <input id="student-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, entreprise, tuteur…" />
      </div>

      {students.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {students.isError && <ErrorAlert error={students.error} fallback="Impossible de charger les élèves" />}
      {students.data && (
        <table className="table">
          <thead>
            <tr>
              <th>Élève</th>
              <th>Entreprise</th>
              <th>Tuteur entreprise</th>
              <th>Tuteur académique</th>
              <th>Compte</th>
              <th>Soutenance</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((student) => (
              <tr key={student.id}>
                <td>
                  {student.lastName} {student.firstName}
                  <br />
                  <small>{student.email}</small>
                </td>
                <td>{student.company.name}</td>
                <td>{student.companyTutor.name}</td>
                <td>{student.academicTutor.name}</td>
                <td>{student.hasAccount ? 'Oui' : 'Non'}</td>
                <td>{student.placed ? 'Placée' : 'À placer'}</td>
                <td>
                  <button
                    className="link-button"
                    type="button"
                    aria-label={`Modifier ${student.firstName} ${student.lastName}`}
                    onClick={() => setDraft(toDraft(student))}
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
