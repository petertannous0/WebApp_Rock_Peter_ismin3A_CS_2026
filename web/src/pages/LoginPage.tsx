import { useState, type SubmitEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { HOME_BY_ROLE } from '../auth/roles';

/** What RequireRole leaves in the state of the navigation: the page that was asked for. */
interface FromState {
  from?: string;
}

/** The login page, at /login. No sign-up: the accounts are created by the administration. */
export const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in: nothing to do here.
  if (user && !submitting) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = await login(email, password);
      // Back to the page RequireRole came from, or to the home page of the role.
      const from = (location.state as FromState | null)?.from;
      navigate(from ?? HOME_BY_ROLE[payload.role], { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : err instanceof ApiError && err.status === 400
            ? 'Saisissez une adresse e-mail valide et un mot de passe.'
            : `Connexion impossible : ${err instanceof Error ? err.message : String(err)}`,
      );
      setSubmitting(false);
    }
  };

  return (
    <section className="page form-page">
      <h2>Connexion</h2>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-email">Adresse e-mail</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <button className="button" type="submit" disabled={submitting}>
          Se connecter
        </button>
      </form>

      <p className="hint">Pas de compte&nbsp;? Il est créé par la scolarité.</p>
    </section>
  );
};
