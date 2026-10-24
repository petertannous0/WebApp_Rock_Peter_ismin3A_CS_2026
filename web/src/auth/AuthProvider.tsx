import { createContext, useContext, useState, type ReactNode } from 'react';
import * as api from '../api';
import { decodePayload, isExpired, type JwtPayload } from './jwt';

export const TOKEN_KEY = 'token';

export interface Auth {
  token: string | null;
  user: JwtPayload | null;
  login: (email: string, password: string) => Promise<JwtPayload>;
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

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

  const user = token ? decodePayload(token) : null;

  const login = async (email: string, password: string) => {
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

export const useAuth = (): Auth => {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return auth;
};
