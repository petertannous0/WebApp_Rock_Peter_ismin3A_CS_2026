import type { Role } from '../types';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  /** Issued at, in seconds since 1970 */
  iat: number;
  /** Expires at, in seconds since 1970 */
  exp: number;
}

/**
 * Reads the payload of a JWT, the part between the two dots, or null when
 * the token cannot be read.
 *
 * The payload is encoded, not encrypted: the front reads it to know who is
 * logged in and which pages to show, and never trusts it for anything else.
 * The API checks the signature on every request.
 */
export function decodePayload(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    // base64url → base64: the URL-safe alphabet has - and _ where base64 has + and /.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload, now = Date.now()): boolean {
  return payload.exp * 1000 <= now + 5_000;
}
