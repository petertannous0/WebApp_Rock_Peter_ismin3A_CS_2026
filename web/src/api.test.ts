import { describe, expect, it } from 'vitest';
import { ApiError, throwIfNotOk } from './api';
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
