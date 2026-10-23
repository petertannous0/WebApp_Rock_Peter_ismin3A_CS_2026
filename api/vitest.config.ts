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
  },
});
