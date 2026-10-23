/**
 * Populates the database. Running it twice changes nothing.
 *
 *   npm run db:seed
 *
 * Empty until the schema has models (phase 2).
 */
import 'dotenv/config';

async function main(): Promise<void> {
  console.log('✅ nothing to seed yet');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
