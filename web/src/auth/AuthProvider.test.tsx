import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import { fakeApi, makeToken, nestError } from '../test-utils';
import { AuthProvider, TOKEN_KEY, useAuth } from './AuthProvider';
import { decodePayload, isExpired } from './jwt';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const token = makeToken({ role: 'ENSEIGNANT', email: 'paul.durand@castelmont.fr' });

describe('AuthProvider', () => {
  it('starts logged out when localStorage holds no token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it('logs in: keeps the token, in the state and in localStorage, and reads the role from it', async () => {
    fakeApi({ 'POST /auth/login': () => Response.json({ access_token: token }) });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => result.current.login('paul.durand@castelmont.fr', 'soutenance2027'));

    expect(result.current.token).toBe(token);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
    expect(result.current.user).toMatchObject({ email: 'paul.durand@castelmont.fr', role: 'ENSEIGNANT' });
  });

  it('lets the ApiError of a wrong password through, and stays logged out', async () => {
    fakeApi({ 'POST /auth/login': () => nestError(401, 'Wrong email or password') });
    const { result } = renderHook(() => useAuth(), { wrapper });

    let error: unknown;
    await act(() => result.current.login('x@castelmont.fr', 'wrong').catch((e: unknown) => (error = e)));

    expect(error).toBeInstanceOf(ApiError);
    expect(result.current.token).toBeNull();
  });

  it('is still logged in after a reload', () => {
    localStorage.setItem(TOKEN_KEY, token);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user?.role).toBe('ENSEIGNANT');
  });

  it('logs out: forgets the token', () => {
    localStorage.setItem(TOKEN_KEY, token);
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe('jwt', () => {
  it('reads the payload of a token, and null for garbage', () => {
    expect(decodePayload(token)).toMatchObject({ role: 'ENSEIGNANT' });
    expect(decodePayload('garbage')).toBeNull();
  });

  it('knows an expired token', () => {
    expect(isExpired(decodePayload(makeToken({ expired: true }))!)).toBe(true);
    expect(isExpired(decodePayload(makeToken())!)).toBe(false);
  });
});
