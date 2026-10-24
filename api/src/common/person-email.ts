import { normalizeEmail } from '../auth/auth.service.js';
import { AlreadyUsed } from './errors.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * A teacher's or student's email, checked before a change. It is also their
 * login when they have an account: the account's email must stay free too,
 * and follows the change (see `syncAccountEmail`).
 */
export async function checkPersonEmail(
  prisma: PrismaService,
  table: 'teacher' | 'student',
  email: string,
  self?: { id: number; userId: number | null },
): Promise<string> {
  const normalized = normalizeEmail(email);
  const owner =
    table === 'teacher'
      ? await prisma.teacher.findUnique({ where: { email: normalized } })
      : await prisma.student.findUnique({ where: { email: normalized } });
  if (owner && owner.id !== self?.id) throw new AlreadyUsed('Email', normalized);

  const account = await prisma.user.findUnique({ where: { email: normalized } });
  if (account && account.id !== self?.userId) throw new AlreadyUsed('Email', normalized);
  return normalized;
}

export async function syncAccountEmail(prisma: PrismaService, userId: number | null, email: string): Promise<void> {
  if (userId !== null) await prisma.user.update({ where: { id: userId }, data: { email } });
}
