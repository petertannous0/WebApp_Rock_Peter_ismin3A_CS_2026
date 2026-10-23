import { createContext, useContext, useState, type ReactNode } from 'react';
import * as api from '../api';
import { decodePayload, isExpired, type JwtPayload } from './jwt';

/** Where the token is kept: DevTools → Application → Local Storage, under this key. */
export const TOKEN_KEY = 'token';

/** What every component under <AuthProvider> can ask for, with useAuth(). */
export interface Auth {
  /** The raw token, for the Authorization header. null: logged out. */
  token: string | null;
  /** Who is logged in, read from the payload of the token. null: logged out. */
  user: JwtPayload | null;
  /** Asks the API for a token and keeps it. Lets the ApiError through: 401 for a wrong password. */
  login: (email: string, password: string) => Promise<JwtPayload>;
  /** Forgets the token. */
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

/** A token from localStorage, or null when there is none, or when it cannot be read or has expired. */
function storedToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const payload = token ? decodePayload(token) : null;
  if (!token || !payload || isExpired(payload)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

/**
 * The logged-in user, for the whole app. The token lives in a state, so that
 * React redraws when it changes, and in localStorage, so that it survives a reload.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(storedToken);

  // Computed at each render from the token: nothing to keep in step.
  const user = token ? decodePayload(token) : null;

  const login = async (email: string, password: string) => {
    // A wrong password throws here, before anything is kept: the page shows the error.
    const newToken = await api.login(email, password);
    const payload = decodePayload(newToken);
    if (!payload) throw new Error('Jeton illisible');
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    return payload;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return <AuthContext value={{ token, user, login, logout }}>{children}</AuthContext>;
};

/** The logged-in user, from any component under <AuthProvider>. */
export const useAuth = (): Auth => {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return auth;
};
