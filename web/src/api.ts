import type {
  Account,
  CheckResult,
  Company,
  CompanyTutor,
  CompanyTutorInput,
  CompanyTutorSchedule,
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
  StudentSchedule,
  Teacher,
  TeacherAvailability,
  TeacherDefense,
} from './types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export class ApiDownError extends Error {
  constructor() {
    super('L’API ne répond pas');
    this.name = 'ApiDownError';
  }
}

export function isApiDown(error: unknown): boolean {
  return error instanceof ApiDownError || (error instanceof ApiError && [502, 503, 504].includes(error.status));
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiDownError();
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

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await call(path, { headers: authHeaders(token) });
  await throwIfNotOk(res);
  // A promise made to the compiler, not a check: the API is trusted to send this shape.
  return (await res.json()) as T;
}

export async function checkHealth(): Promise<void> {
  await throwIfNotOk(await call('/health'));
}

export async function login(email: string, password: string): Promise<string> {
  const res = await call('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  await throwIfNotOk(res);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

export function fetchAccounts(token: string): Promise<Account[]> {
  return getJson('/users', token);
}

export async function createAccount(account: NewAccount, token: string): Promise<Account> {
  const res = await call('/users', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(account),
  });
  await throwIfNotOk(res);
  return (await res.json()) as Account;
}

export function fetchTeachers(token: string): Promise<Teacher[]> {
  return getJson('/teachers', token);
}

export function fetchStudents(token: string): Promise<Student[]> {
  return getJson('/students', token);
}

async function send<T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown, token: string): Promise<T> {
  const res = await call(path, { method, headers: authHeaders(token), body: JSON.stringify(body) });
  await throwIfNotOk(res);
  return (await res.json()) as T;
}

export function fetchSession(token: string): Promise<Session> {
  return getJson('/session', token);
}

export function createSession(session: NewSession, token: string): Promise<Session> {
  return send('POST', '/session', session, token);
}

export function updateSession(patch: { name?: string; startDate?: string }, token: string): Promise<Session> {
  return send('PATCH', '/session', patch, token);
}

export function updateRoom(id: number, patch: Partial<RoomInput>, token: string): Promise<Room> {
  return send('PATCH', `/session/rooms/${id}`, patch, token);
}

export function fetchCompanies(token: string): Promise<Company[]> {
  return getJson('/companies', token);
}

export function saveCompany(name: string, token: string, id?: number): Promise<Company> {
  return id ? send('PATCH', `/companies/${id}`, { name }, token) : send('POST', '/companies', { name }, token);
}

export function saveCompanyTutor(tutor: CompanyTutorInput, token: string, id?: number): Promise<CompanyTutor> {
  return id ? send('PATCH', `/company-tutors/${id}`, tutor, token) : send('POST', '/company-tutors', tutor, token);
}

export function saveTeacher(teacher: PersonInput, token: string, id?: number): Promise<Teacher> {
  return id ? send('PATCH', `/teachers/${id}`, teacher, token) : send('POST', '/teachers', teacher, token);
}

export function saveStudent(student: StudentInput, token: string, id?: number): Promise<Student> {
  return id ? send('PATCH', `/students/${id}`, student, token) : send('POST', '/students', student, token);
}

export function fetchMyAvailability(token: string): Promise<MyAvailability> {
  return getJson('/me/unavailability', token);
}

export function saveMyAvailability(halfDays: HalfDaySlot[], token: string): Promise<MyAvailability> {
  return send('PUT', '/me/unavailability', { halfDays }, token);
}

export function fetchAvailabilityOverview(token: string): Promise<TeacherAvailability[]> {
  return getJson('/availability', token);
}

export function fetchDefenses(token: string): Promise<Defense[]> {
  return getJson('/defenses', token);
}

export function checkDefense(proposal: Proposal, token: string): Promise<CheckResult> {
  return send('POST', '/defenses/check', proposal, token);
}

export function createDefense(proposal: Omit<Proposal, 'defenseId'> & { force: boolean }, token: string): Promise<Defense> {
  return send('POST', '/defenses', proposal, token);
}

export function moveDefense(
  id: number,
  patch: { slotId: number; roomId: number; secondTeacherId: number; force: boolean },
  token: string,
): Promise<Defense> {
  return send('PATCH', `/defenses/${id}`, patch, token);
}

export async function deleteDefense(id: number, token: string): Promise<void> {
  const res = await call(`/defenses/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  await throwIfNotOk(res);
}

export function refusalOf(error: unknown): CheckResult | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as Partial<CheckResult> | undefined;
  return Array.isArray(body?.violations) ? (body as CheckResult) : null;
}

export function fetchMyDefenses(token: string): Promise<TeacherDefense[]> {
  return getJson('/me/defenses', token);
}

export function fetchMyDefense(token: string): Promise<StudentSchedule> {
  return getJson('/me/defense', token);
}

export function fetchCompanyTutorSchedules(token: string): Promise<CompanyTutorSchedule[]> {
  return getJson('/company-tutors/schedule', token);
}
