import { useEffect } from 'react';
import { ApiError } from '../api';
import { useAuth } from './AuthProvider';

/**
 * Logs out when a request answered 401: the token has expired or was
 * refused. Logged out, RequireRole sends to /login, which comes back here.
 */
export function useLogoutOn401(...errors: unknown[]): void {
  const { logout } = useAuth();
  const expired = errors.some((error) => error instanceof ApiError && error.status === 401);

  useEffect(() => {
    if (expired) logout();
  }, [expired, logout]);
}
