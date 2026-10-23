import { Link, NavLink } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { HOME_BY_ROLE } from '../auth/roles';
import { ROLE_LABELS, type Role } from '../types';

/** The links of each role. Each page is still guarded by RequireRole, and each request by the API. */
const LINKS: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [
    { to: '/admin', label: 'Tableau de bord' },
    { to: '/admin/placement', label: 'Placement' },
    { to: '/admin/tuteurs', label: 'Tuteurs entreprise' },
    { to: '/admin/session', label: 'Session' },
    { to: '/admin/entreprises', label: 'Entreprises' },
    { to: '/admin/enseignants', label: 'Enseignants' },
    { to: '/admin/eleves', label: 'Élèves' },
    { to: '/admin/disponibilites', label: 'Disponibilités' },
    { to: '/admin/comptes', label: 'Comptes' },
  ],
  ENSEIGNANT: [{ to: '/enseignant', label: 'Mon espace' }],
  ELEVE: [{ to: '/eleve', label: 'Ma soutenance' }],
};

/** The top of every page: the title, the links of the role, who is logged in. */
export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">
          <Link to={user ? HOME_BY_ROLE[user.role] : '/login'}>Soutenances de stage</Link>
        </h1>
        <p className="app-tagline">École d'ingénieurs de Castelmont, 3A</p>
      </div>

      {user && (
        <nav className="app-nav" aria-label="Navigation principale">
          {LINKS[user.role].map((link) => (
            // end: "Tableau de bord" (/admin) is not active on /admin/comptes.
            <NavLink key={link.to} to={link.to} end>
              {link.label}
            </NavLink>
          ))}
          <span className="app-user">
            {user.email} · {ROLE_LABELS[user.role]}
          </span>
          <button className="link-button" type="button" onClick={logout}>
            Se déconnecter
          </button>
        </nav>
      )}
    </header>
  );
};
