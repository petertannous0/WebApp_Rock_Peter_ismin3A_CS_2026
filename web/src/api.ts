import type {
  Account,
  CheckResult,
  Company,
  CompanyTutor,
  CompanyTutorInput,
  Defense,
  HalfDaySlot,
  MyAvailability,
  NewAccount,
  NewSession,
  PersonInput,
  Proposal,
  Room,
  RoomInput,
  Session,
  Student,
  StudentInput,
  Teacher,
  TeacherAvailability,
} from './types';

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
  /** The whole body of the answer: a refused placement (409) carries its violations there. */
  readonly body: unknown;

  constructor(status: number, message: string, details: string[] = [], body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.body = body;
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
  throw new ApiError(res.status, `L'API a répondu ${res.status}`, details, body);
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

/** POST, PATCH or PUT a JSON body with the token, and the JSON answer. */
async function send<T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method, headers: authHeaders(token), body: JSON.stringify(body) });
  await throwIfNotOk(res);
  return (await res.json()) as T;
}

// ─── F1: the session ───────────────────────────────────────────────────────

/** GET /session, any role. No session yet: an ApiError whose status is 404. */
export function fetchSession(token: string): Promise<Session> {
  return getJson('/session', token);
}

/** POST /session, ADMIN. 409 a session exists, 422 not a Monday. */
export function createSession(session: NewSession, token: string): Promise<Session> {
  return send('POST', '/session', session, token);
}

/** PATCH /session, ADMIN. 409 when the start date changes after a defense is placed. */
export function updateSession(patch: { name?: string; startDate?: string }, token: string): Promise<Session> {
  return send('PATCH', '/session', patch, token);
}

/** PATCH /session/rooms/:id, ADMIN. */
export function updateRoom(id: number, patch: Partial<RoomInput>, token: string): Promise<Room> {
  return send('PATCH', `/session/rooms/${id}`, patch, token);
}

// ─── F1: the people ────────────────────────────────────────────────────────

export function fetchCompanies(token: string): Promise<Company[]> {
  return getJson('/companies', token);
}

/** 409 name already used. */
export function saveCompany(name: string, token: string, id?: number): Promise<Company> {
  return id ? send('PATCH', `/companies/${id}`, { name }, token) : send('POST', '/companies', { name }, token);
}

/** 409 email already used, 422 unknown company or tutor who still follows students. */
export function saveCompanyTutor(tutor: CompanyTutorInput, token: string, id?: number): Promise<CompanyTutor> {
  return id ? send('PATCH', `/company-tutors/${id}`, tutor, token) : send('POST', '/company-tutors', tutor, token);
}

/** 409 email already used. */
export function saveTeacher(teacher: PersonInput, token: string, id?: number): Promise<Teacher> {
  return id ? send('PATCH', `/teachers/${id}`, teacher, token) : send('POST', '/teachers', teacher, token);
}

/** 409 email already used, 422 unknown company/tutor/teacher or tutor of another company. */
export function saveStudent(student: StudentInput, token: string, id?: number): Promise<Student> {
  return id ? send('PATCH', `/students/${id}`, student, token) : send('POST', '/students', student, token);
}

// ─── F1: the availability ──────────────────────────────────────────────────

/** GET /me/unavailability, ENSEIGNANT. */
export function fetchMyAvailability(token: string): Promise<MyAvailability> {
  return getJson('/me/unavailability', token);
}

/** PUT /me/unavailability, ENSEIGNANT: replaces the whole list. 422 a day outside the session. */
export function saveMyAvailability(halfDays: HalfDaySlot[], token: string): Promise<MyAvailability> {
  return send('PUT', '/me/unavailability', { halfDays }, token);
}

/** GET /availability, ADMIN: every teacher, answered or not. */
export function fetchAvailabilityOverview(token: string): Promise<TeacherAvailability[]> {
  return getJson('/availability', token);
}

// ─── F2: placement ─────────────────────────────────────────────────────────

/** GET /defenses, ADMIN: every placed defense, with its current conflicts. */
export function fetchDefenses(token: string): Promise<Defense[]> {
  return getJson('/defenses', token);
}

/** POST /defenses/check, ADMIN: the dry run, nothing saved. */
export function checkDefense(proposal: Proposal, token: string): Promise<CheckResult> {
  return send('POST', '/defenses/check', proposal, token);
}

/** POST /defenses, ADMIN. Refused: 409, the violations in `ApiError.body` (see `refusalOf`). */
export function createDefense(proposal: Omit<Proposal, 'defenseId'> & { force: boolean }, token: string): Promise<Defense> {
  return send('POST', '/defenses', proposal, token);
}

/** PATCH /defenses/:id, ADMIN: a move. Same refusals as the creation. */
export function moveDefense(
  id: number,
  patch: { slotId: number; roomId: number; secondTeacherId: number; force: boolean },
  token: string,
): Promise<Defense> {
  return send('PATCH', `/defenses/${id}`, patch, token);
}

/** DELETE /defenses/:id, ADMIN. */
export async function deleteDefense(id: number, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/defenses/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  await throwIfNotOk(res);
}

/** The violations of a refused placement (409), or null for any other error. */
export function refusalOf(error: unknown): CheckResult | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as Partial<CheckResult> | undefined;
  return Array.isArray(body?.violations) ? (body as CheckResult) : null;
}
