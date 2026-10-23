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
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });
  return {
    user: model(),
    teacher: model(),
    student: model(),
  };
}

export type PrismaMock = ReturnType<typeof prismaMock>;

/** The mock, typed as the real service for the constructors that expect it. */
export function asPrisma(mock: PrismaMock): PrismaService {
  return mock as unknown as PrismaService;
}
