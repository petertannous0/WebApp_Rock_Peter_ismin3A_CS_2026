import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

export class NotFound extends Error {
  constructor(what: string, id: number) {
    super(`${what} ${id} not found`);
  }
}

export class AlreadyUsed extends Error {
  constructor(what: string, value: string) {
    super(`${what} ${value} is already used`);
  }
}

export class InvalidReference extends Error {}

export function toHttp(error: unknown): never {
  if (error instanceof NotFound) throw new NotFoundException(error.message);
  if (error instanceof AlreadyUsed) throw new ConflictException(error.message);
  if (error instanceof InvalidReference) throw new UnprocessableEntityException(error.message);
  throw error;
}
