import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/**
 * Before the suite: a fresh `e2e.db`, from the migrations, then the seed.
 * Every run starts from the same data, whatever the previous one left behind.
 * It never touches `dev.db`.
 */
export default function setup(): void {
  for (const file of ['e2e.db', 'e2e.db-journal']) rmSync(file, { force: true });
  const env = { ...process.env, DATABASE_URL: 'file:./e2e.db' };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', env });
}
