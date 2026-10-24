import { vi } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * A fake PrismaService: one `vi.fn()` per method the services call. No
 * database: each test decides what the fake answers, with mockResolvedValue.
 * Add a method here when a service starts calling it.
 */
export function prismaMock() {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });
  return {
    user: model(),
    teacher: model(),
    student: model(),
    company: model(),
    companyTutor: model(),
    session: model(),
    room: model(),
    slot: model(),
    teacherUnavailability: model(),
    defense: model(),
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
  };
}

export type PrismaMock = ReturnType<typeof prismaMock>;

export function asPrisma(mock: PrismaMock): PrismaService {
  return mock as unknown as PrismaService;
}
