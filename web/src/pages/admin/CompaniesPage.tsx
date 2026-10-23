import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { fetchCompanies, saveCompany, saveCompanyTutor } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { Company, CompanyTutor, CompanyTutorInput } from '../../types';

const EMPTY_TUTOR = { firstName: '', lastName: '', email: '', companyId: '' };

/**
 * Companies and their tutors, at /admin/entreprises. A tutor has no account:
 * name and email only. Added and edited, never deleted.
 */
export const CompaniesPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => fetchCompanies(token!) });

  const [companyEdit, setCompanyEdit] = useState<{ id?: number; name: string }>({ name: '' });
  const [tutorEdit, setTutorEdit] = useState<{ id?: number } & typeof EMPTY_TUTOR>(EMPTY_TUTOR);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['companies'] });
    void queryClient.invalidateQueries({ queryKey: ['students'] });
  };

  const companyMutation = useMutation({
    mutationFn: () => saveCompany(companyEdit.name, token!, companyEdit.id),
    onSuccess: () => {
      setCompanyEdit({ name: '' });
      refresh();
    },
  });
  const tutorMutation = useMutation({
    mutationFn: () => {
      const { id, companyId, ...person } = tutorEdit;
      const input: CompanyTutorInput = { ...person, companyId: Number(companyId) };
      return saveCompanyTutor(input, token!, id);
    },
    onSuccess: () => {
      setTutorEdit(EMPTY_TUTOR);
      refresh();
    },
  });
  useLogoutOn401(companies.error, companyMutation.error, tutorMutation.error);

  const editTutor = (tutor: CompanyTutor) =>
    setTutorEdit({ id: tutor.id, firstName: tutor.firstName, lastName: tutor.lastName, email: tutor.email, companyId: String(tutor.companyId) });

  const submitCompany = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    companyMutation.mutate();
  };
  const submitTutor = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    tutorMutation.mutate();
  };

  return (
    <section className="page">
      <h2>Entreprises et tuteurs</h2>

      <div className="forms">
        <form className="form panel" onSubmit={submitCompany} aria-label="Entreprise">
          <h3>{companyEdit.id ? 'Renommer l’entreprise' : 'Ajouter une entreprise'}</h3>
          <div className="field">
            <label htmlFor="company-name">Nom de l’entreprise</label>
            <input id="company-name" value={companyEdit.name} onChange={(event) => setCompanyEdit({ ...companyEdit, name: event.target.value })} required />
          </div>
          {companyMutation.isError && (
            <ErrorAlert error={companyMutation.error} messages={{ 409: 'Une entreprise porte déjà ce nom.' }} fallback="Impossible d’enregistrer" />
          )}
          <div className="actions">
            <button className="button" type="submit" disabled={companyMutation.isPending}>
              Enregistrer
            </button>
            {companyEdit.id && (
              <button className="link-button" type="button" onClick={() => setCompanyEdit({ name: '' })}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <form className="form panel" onSubmit={submitTutor} aria-label="Tuteur entreprise">
          <h3>{tutorEdit.id ? 'Modifier le tuteur' : 'Ajouter un tuteur entreprise'}</h3>
          <div className="field">
            <label htmlFor="tutor-company">Entreprise</label>
            <select id="tutor-company" value={tutorEdit.companyId} onChange={(event) => setTutorEdit({ ...tutorEdit, companyId: event.target.value })} required>
              <option value="">— Choisir —</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tutor-first">Prénom</label>
            <input id="tutor-first" value={tutorEdit.firstName} onChange={(event) => setTutorEdit({ ...tutorEdit, firstName: event.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="tutor-last">Nom</label>
            <input id="tutor-last" value={tutorEdit.lastName} onChange={(event) => setTutorEdit({ ...tutorEdit, lastName: event.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="tutor-email">E-mail</label>
            <input id="tutor-email" type="email" value={tutorEdit.email} onChange={(event) => setTutorEdit({ ...tutorEdit, email: event.target.value })} required />
          </div>
          {tutorMutation.isError && (
            <ErrorAlert
              error={tutorMutation.error}
              messages={{
                409: 'Cette adresse e-mail est déjà utilisée.',
                422: 'Ce tuteur suit encore des élèves de son entreprise : changez d’abord leur tuteur.',
              }}
              fallback="Impossible d’enregistrer"
            />
          )}
          <div className="actions">
            <button className="button" type="submit" disabled={tutorMutation.isPending}>
              Enregistrer
            </button>
            {tutorEdit.id && (
              <button className="link-button" type="button" onClick={() => setTutorEdit(EMPTY_TUTOR)}>
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      {companies.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {companies.isError && <ErrorAlert error={companies.error} fallback="Impossible de charger les entreprises" />}
      {companies.data && <CompanyTable companies={companies.data} onEditCompany={(c) => setCompanyEdit({ id: c.id, name: c.name })} onEditTutor={editTutor} />}
    </section>
  );
};

interface CompanyTableProps {
  companies: Company[];
  onEditCompany: (company: Company) => void;
  onEditTutor: (tutor: CompanyTutor) => void;
}

const CompanyTable = ({ companies, onEditCompany, onEditTutor }: CompanyTableProps) => (
  <table className="table">
    <thead>
      <tr>
        <th>Entreprise</th>
        <th>Élèves</th>
        <th>Tuteurs</th>
      </tr>
    </thead>
    <tbody>
      {companies.map((company) => (
        <tr key={company.id}>
          <td>
            {company.name}{' '}
            <button className="link-button" type="button" onClick={() => onEditCompany(company)} aria-label={`Renommer ${company.name}`}>
              Renommer
            </button>
          </td>
          <td>{company.studentCount}</td>
          <td>
            <ul className="plain-list">
              {company.tutors.map((tutor) => (
                <li key={tutor.id}>
                  {tutor.firstName} {tutor.lastName} · {tutor.email}{' '}
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => onEditTutor(tutor)}
                    aria-label={`Modifier ${tutor.firstName} ${tutor.lastName}`}
                  >
                    Modifier
                  </button>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
