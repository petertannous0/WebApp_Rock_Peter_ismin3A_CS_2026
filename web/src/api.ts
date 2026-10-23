import type { Account, NewAccount, Student, Teacher } from './types';

/** Where the API runs, read from `.env` at build time. The fallback is the port of `npm run start:dev`. */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * An answer of the API that is not ok: a 4xx or a 5xx. `status` says which
 * one, and the pages decide what to show from it. `details` holds what the
 * API explained, one sentence per invalid field for a 400.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Does nothing when the answer is ok, throws an ApiError otherwise.
 *
 * NestJS explains its errors in the body, `{ statusCode, message, error }`:
 * `message` is a sentence, or a list of sentences for a 400.
 */
export async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  const body: unknown = await res.json().catch(() => undefined);
  const message = body && typeof body === 'object' && 'message' in body ? body.message : undefined;
  const details = Array.isArray(message) ? message.map(String) : typeof message === 'string' ? [message] : [];
  throw new ApiError(res.status, `L'API a répondu ${res.status}`, details);
}

/** The headers of an authenticated JSON request. */
function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** GET a JSON answer, with the token. */
async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  await throwIfNotOk(res);
  // A promise made to the compiler, not a check: the API is trusted to send this shape.
  return (await res.json()) as T;
}

/** POST /auth/login, and the `access_token` of the answer. A wrong password: 401. */
export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  await throwIfNotOk(res);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

/** GET /users, ADMIN only. */
export function fetchAccounts(token: string): Promise<Account[]> {
  return getJson('/users', token);
}

/** POST /users, ADMIN only. 404 unknown person, 409 already has an account. */
export async function createAccount(account: NewAccount, token: string): Promise<Account> {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(account),
  });
  await throwIfNotOk(res);
  return (await res.json()) as Account;
}

/** GET /teachers, ADMIN only. */
export function fetchTeachers(token: string): Promise<Teacher[]> {
  return getJson('/teachers', token);
}

/** GET /students, ADMIN only. */
export function fetchStudents(token: string): Promise<Student[]> {
  return getJson('/students', token);
}
