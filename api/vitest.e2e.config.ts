import { defineConfig } from 'vitest/config';

/**
 * `npm run test:e2e`: the whole API on a real SQLite file, `e2e.db`, rebuilt
 * from the migrations and the seed before each run. No Docker, no server, but
 * a database: that is why these tests are not part of `npm test`.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test-e2e/**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: { DATABASE_URL: 'file:./e2e.db', JWT_SECRET: 'e2e-secret' },
    globalSetup: ['test-e2e/global-setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
