import { useEffect } from 'react';
import { ApiError } from '../api';
import { useAuth } from './AuthProvider';

export function useLogoutOn401(...errors: unknown[]): void {
  const { logout } = useAuth();
  const expired = errors.some((error) => error instanceof ApiError && error.status === 401);

  useEffect(() => {
    if (expired) logout();
  }, [expired, logout]);
}
