import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.guard.js';
import { verifyPassword } from './password.js';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * A signed token for this email and password, or null. The same null for an
   * unknown email and a wrong password: the answer does not tell which accounts exist.
   */
  async login(email: string, password: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user || !verifyPassword(password, user.passwordHash)) return null;

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.signAsync(payload);
  }
}
