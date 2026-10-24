import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import App from './App';
import { AuthProvider, TOKEN_KEY } from './auth/AuthProvider';
import type { Role } from './types';

export function renderApp(route = '/', { token }: { token?: string } = {}) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

export const EMAILS: Record<Role, string> = {
  ADMIN: 'admin@castelmont.fr',
  ENSEIGNANT: 'paul.durand@castelmont.fr',
  ELEVE: 'lea.martin@etu.castelmont.fr',
};

/**
 * A token as the API makes them: a real header and payload in base64url,
 * valid for an hour (or already expired). The signature is fake: the front
 * never checks it, only the API can.
 */
export function makeToken({ role = 'ADMIN', email = EMAILS[role], expired = false }: { role?: Role; email?: string; expired?: boolean } = {}): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: 1, email, role, iat: now - 7200, exp: expired ? now - 3600 : now + 3600 });
  return `${header}.${payload}.fake-signature`;
}

type Handler = (request: Request) => Response | Promise<Response>;

/**
 * Replaces `fetch` by a fake API. `routes` maps a method and a path to an
 * answer: `{ 'GET /students': () => Response.json([...]) }`. The query string
 * counts when the route has one. `GET /health` is ok unless the routes say
 * otherwise. Any other request: 404.
 *
 * Returns the list of the requests made, to check what the app sent.
 */
export function fakeApi(fakes: Record<string, Handler>): Request[] {
  const routes: Record<string, Handler> = { 'GET /health': () => Response.json({ status: 'ok' }), ...fakes };
  const requests: Request[] = [];

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request.clone());
    const { pathname, search } = new URL(request.url);
    const handler = routes[`${request.method} ${pathname}${search}`] ?? routes[`${request.method} ${pathname}`];
    if (!handler) {
      return Response.json({ statusCode: 404, message: `No fake for ${request.method} ${pathname}` }, { status: 404 });
    }
    return handler(request);
  };

  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  return requests;
}

export function nestError(status: number, message: string | string[]): Response {
  return Response.json({ statusCode: status, message }, { status });
}

export function pathOf(request: Request): string {
  const { pathname, search } = new URL(request.url);
  return pathname + search;
}
