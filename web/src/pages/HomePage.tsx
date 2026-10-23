import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { HOME_BY_ROLE } from '../auth/roles';

/** At /: nothing to show of its own. To the home page of the role, or to the login. */
export const HomePage = () => {
  const { user } = useAuth();
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />;
};
