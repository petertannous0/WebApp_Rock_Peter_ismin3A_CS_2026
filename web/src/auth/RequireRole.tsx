import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '../types';
import { useAuth } from './AuthProvider';
import { HOME_BY_ROLE } from './roles';

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
}

/**
 * Guards a page by role. Logged out: to /login, which comes back here once
 * logged in. Logged in with another role: to the home page of that role.
 *
 * It only hides pages. The protection is on the API, which checks the token
 * and the role of every request: a front can always be bypassed.
 */
export const RequireRole = ({ roles, children }: RequireRoleProps) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // replace: the protected page does not stay in the history, "Back" does not loop on it.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }
  return children;
};
