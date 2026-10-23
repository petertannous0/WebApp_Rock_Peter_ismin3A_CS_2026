import { defineConfig } from 'vitest/config';

/**
 * `npm test`: unit tests only, no database, no Docker. Prisma is mocked in
 * the service tests.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.spec.ts'],
    // AuthModule refuses to start without a secret; PrismaService without a URL
    // (never used: the tests replace it by a mock).
    env: { JWT_SECRET: 'test-secret', DATABASE_URL: 'file:./unused.db' },
  },
});
