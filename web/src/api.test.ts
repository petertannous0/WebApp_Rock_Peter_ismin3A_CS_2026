import { describe, expect, it, vi } from 'vitest';
import { ApiDownError, ApiError, checkHealth, isApiDown, throwIfNotOk } from './api';
import { nestError } from './test-utils';

/** The error of a promise, or undefined when it resolves. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('throwIfNotOk', () => {
  it('does nothing for an ok answer', async () => {
    await expect(throwIfNotOk(Response.json({}))).resolves.toBeUndefined();
  });

  it('throws an ApiError with the status and the sentence of NestJS', async () => {
    const error = await rejection(throwIfNotOk(nestError(409, 'Already placed')));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, details: ['Already placed'] });
  });

  it('keeps every sentence of a 400 in `details`', async () => {
    const error = await rejection(throwIfNotOk(nestError(400, ['name should not be empty', 'email must be an email'])));

    expect(error).toMatchObject({ status: 400, details: ['name should not be empty', 'email must be an email'] });
  });

  it('still throws when the body is not JSON', async () => {
    const error = await rejection(throwIfNotOk(new Response('Bad Gateway', { status: 502 })));

    expect(error).toMatchObject({ status: 502, details: [] });
  });
});

describe('the API down', () => {
  it('turns a request that never reached the API into an ApiDownError', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    const error = await rejection(checkHealth());

    expect(error).toBeInstanceOf(ApiDownError);
    expect(isApiDown(error)).toBe(true);
  });

  it('counts a gateway error as down, not a 500 nor a 404', () => {
    expect(isApiDown(new ApiError(503, 'x'))).toBe(true);
    expect(isApiDown(new ApiError(500, 'x'))).toBe(false);
    expect(isApiDown(new ApiError(404, 'x'))).toBe(false);
    expect(isApiDown(new TypeError('a bug of the page'))).toBe(false);
  });
});
