import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

/**
 * The domain errors shared by the people modules (companies, tutors,
 * teachers, students). Services throw them; `toHttp` turns them into answers.
 */

/** The record of the URL does not exist: 404. */
export class NotFound extends Error {
  constructor(what: string, id: number) {
    super(`${what} ${id} not found`);
  }
}

/** A unique value is already used (email, name): 409. */
export class AlreadyUsed extends Error {
  constructor(what: string, value: string) {
    super(`${what} ${value} is already used`);
  }
}

/** The body points at a record that does not exist, or does not fit: 422. */
export class InvalidReference extends Error {}

export function toHttp(error: unknown): never {
  if (error instanceof NotFound) throw new NotFoundException(error.message);
  if (error instanceof AlreadyUsed) throw new ConflictException(error.message);
  if (error instanceof InvalidReference) throw new UnprocessableEntityException(error.message);
  throw error;
}
