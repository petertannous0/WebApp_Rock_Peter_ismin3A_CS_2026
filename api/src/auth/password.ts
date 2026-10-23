import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * A password is never stored: only a salted hash of it is.
 *
 * Format stored: `salt:hash`, both in hex. The comparison takes the same time
 * whatever the input, so the time of an answer tells nothing about the hash.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
