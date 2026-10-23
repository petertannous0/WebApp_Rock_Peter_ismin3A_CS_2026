import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import App from './App';

/**
 * The helpers of the tests. No browser, no API during the tests: the URL
 * lives in a MemoryRouter, and `fetch` is replaced by a fake API.
 */

/** The whole app, as main.tsx mounts it, at `route`. A failed request is not retried. */
export function renderApp(route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** One component alone, with a router around it for its <Link>. */
export function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/** What the fake API answers to one request. */
type Handler = (request: Request) => Response | Promise<Response>;

/**
 * Replaces `fetch` by a fake API. `routes` maps a method and a path to an
 * answer: `{ 'GET /students': () => Response.json([...]) }`. The query string
 * counts when the route has one. Any other request: 404.
 *
 * Returns the list of the requests made, to check what the app sent.
 */
export function fakeApi(routes: Record<string, Handler>): Request[] {
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

/** An error the way NestJS sends them. */
export function nestError(status: number, message: string | string[]): Response {
  return Response.json({ statusCode: status, message }, { status });
}

/** The path and query of a request, without the host: "/defenses?day=1". */
export function pathOf(request: Request): string {
  const { pathname, search } = new URL(request.url);
  return pathname + search;
}
