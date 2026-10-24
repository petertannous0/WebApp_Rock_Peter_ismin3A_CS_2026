import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { ApiError, createAccount, fetchAccounts, fetchStudents, fetchTeachers, isApiDown } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { SERVICE_DOWN_TEXT, ServiceDownAlert } from '../../components/ServiceDown';
import { ROLE_LABELS, type Account, type AccountRole, type Student, type Teacher } from '../../types';

/** What the admin reads for each error of POST /users. The 400 adds what the API explained. */
function describeError(error: unknown): string {
  if (isApiDown(error)) return `😢 Service indisponible. ${SERVICE_DOWN_TEXT}`;
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Le formulaire contient des erreurs :';
    if (error.status === 404) return 'Cette personne est introuvable.';
    if (error.status === 409) return 'Cette personne a déjà un compte, ou son adresse e-mail est déjà utilisée.';
  }
  return `Impossible de créer le compte : ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * The accounts, at /admin/comptes. An account is created for a teacher or a
 * student who already exists: the login is their e-mail, the admin types the
 * first password and passes it on.
 */
export const AccountsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [role, setRole] = useState<AccountRole>('ENSEIGNANT');
  const [personId, setPersonId] = useState('');
  const [password, setPassword] = useState('');
  const [created, setCreated] = useState<Account | null>(null);

  // RequireRole guarantees a token here; TypeScript does not know it.
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => fetchAccounts(token!) });
  const people = useQuery({
    queryKey: [role === 'ENSEIGNANT' ? 'teachers' : 'students'],
    queryFn: (): Promise<(Teacher | Student)[]> => (role === 'ENSEIGNANT' ? fetchTeachers(token!) : fetchStudents(token!)),
  });

  const mutation = useMutation({
    mutationFn: () => createAccount({ role, personId: Number(personId), password }, token!),
    onSuccess: (account) => {
      setCreated(account);
      setPersonId('');
      setPassword('');
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: [role === 'ENSEIGNANT' ? 'teachers' : 'students'] });
    },
  });

  useLogoutOn401(accounts.error, people.error, mutation.error);

  const withoutAccount = (people.data ?? []).filter((person) => !person.hasAccount);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreated(null);
    mutation.mutate();
  };

  return (
    <section className="page wide-page">
      <h2>Comptes</h2>

      <form className="form panel" onSubmit={handleSubmit} aria-label="Créer un compte">
        <h3>Créer un compte</h3>

        <div className="field">
          <label htmlFor="account-role">Rôle</label>
          <select
            id="account-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as AccountRole);
              setPersonId('');
            }}
          >
            <option value="ENSEIGNANT">{ROLE_LABELS.ENSEIGNANT}</option>
            <option value="ELEVE">{ROLE_LABELS.ELEVE}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="account-person">Personne</label>
          <select id="account-person" value={personId} onChange={(event) => setPersonId(event.target.value)} required>
            <option value="">— Choisir ({withoutAccount.length} sans compte) —</option>
            {withoutAccount.map((person) => (
              <option key={person.id} value={person.id}>
                {person.lastName} {person.firstName} ({person.email})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="account-password">Mot de passe initial</label>
          <input
            id="account-password"
            type="text"
            autoComplete="off"
            minLength={8}
            aria-describedby="account-password-hint"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="field-hint" id="account-password-hint">
            8 caractères au moins. À transmettre à la personne.
          </p>
        </div>

        {mutation.isError && (
          <div className="error form-error" role="alert">
            <p>{describeError(mutation.error)}</p>
            {mutation.error instanceof ApiError && mutation.error.status === 400 && (
              <ul>
                {mutation.error.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {created && (
          <p className="success" role="status">
            Compte créé pour {created.name} : identifiant {created.email}.
          </p>
        )}

        {/* Disabled while the API has not answered: a double click would send two POST. */}
        <button className="button" type="submit" disabled={mutation.isPending}>
          Créer le compte
        </button>
      </form>

      <h3>Comptes existants</h3>
      {accounts.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {accounts.isError &&
        (isApiDown(accounts.error) ? (
          <ServiceDownAlert />
        ) : (
          <div className="error" role="alert">
            <span>Impossible de charger les comptes : {accounts.error.message}</span>
          </div>
        ))}
      {accounts.data && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Nom</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.map((account) => (
                <tr key={account.id}>
                  <td>{account.email}</td>
                  <td>{account.name ?? '—'}</td>
                  <td>{ROLE_LABELS[account.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
