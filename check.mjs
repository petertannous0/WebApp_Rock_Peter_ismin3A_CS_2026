/**
 * Checks the whole stack the way the grader will: starts it with docker
 * compose, then asks the API and the front what a user would see.
 * Adapted from the class example (tp10/check.mjs).
 *
 *   npm run check            the stack stays up afterwards
 *   npm run check -- --down  the stack is stopped afterwards
 *
 * No dependency: Node 26 and its fetch.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const API = process.env.CHECK_API_URL ?? 'http://localhost:3000';
const WEB = process.env.CHECK_WEB_URL ?? 'http://localhost:8080';
const DOWN = process.argv.includes('--down');

const results = [];

function compose(...args) {
  return spawnSync('docker', ['compose', ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Retries `fn` until it stops throwing, or until `seconds` have passed. */
async function retry(fn, seconds) {
  const deadline = Date.now() + seconds * 1000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

async function check(label, hint, fn, seconds = 5) {
  try {
    const detail = await retry(fn, seconds);
    results.push(true);
    console.log(`✅ ${label}${detail ? ` : ${detail}` : ''}`);
  } catch (error) {
    results.push(false);
    console.log(`❌ ${label}\n   ${error instanceof Error ? error.message : String(error)}\n   → ${hint}`);
  }
}

function get(url, init) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(3000) });
}

console.log('🐳 docker compose up -d --build …\n');
const up = spawnSync('docker', ['compose', 'up', '-d', '--build'], { cwd: ROOT, stdio: 'inherit' });
if (up.status !== 0) {
  console.log('\n❌ The stack does not start: read the Docker message above.');
  process.exit(1);
}
console.log('');

await check("GET /health answers 200", '`docker compose logs api`', async () => {
  const res = await get(`${API}/health`);
  if (res.status !== 200) throw new Error(`GET ${API}/health answered ${res.status}`);
}, 120);

await check('migrate exited with code 0', '`docker compose logs migrate`', async () => {
  const ps = compose('ps', '--all', '--format', 'json', 'migrate');
  const lines = ps.stdout.trim().split('\n').filter(Boolean);
  if (lines.length === 0) throw new Error('No `migrate` service');
  const service = JSON.parse(lines[0]);
  if (service.State !== 'exited') throw new Error(`migrate is "${service.State}", not exited`);
  if (service.ExitCode !== 0) throw new Error(`migrate exited with code ${service.ExitCode}`);
}, 30);

await check('The front answers on port 8080', '`docker compose logs web`', async () => {
  const res = await get(`${WEB}/`);
  const html = await res.text();
  if (res.status !== 200 || !html.includes('id="root"')) throw new Error(`GET ${WEB}/ answered ${res.status}`);
}, 60);

await check('Reloading a deep link does not give a 404', 'nginx.conf and its try_files', async () => {
  const res = await get(`${WEB}/admin/placement`);
  const html = await res.text();
  if (res.status !== 200 || !html.includes('id="root"')) throw new Error(`GET ${WEB}/admin/placement answered ${res.status}`);
});

await check('The API accepts calls from the front (CORS)', 'WEB_ORIGIN of the `api` service', async () => {
  const res = await get(`${API}/health`, { headers: { Origin: WEB } });
  const allowed = res.headers.get('access-control-allow-origin');
  if (allowed !== WEB) throw new Error(`Access-Control-Allow-Origin is "${allowed ?? 'nothing'}", not ${WEB}`);
});

const passed = results.filter(Boolean).length;
console.log(`\n${passed} / ${results.length} checks pass.`);

if (DOWN) {
  console.log('\n🐳 docker compose down …');
  spawnSync('docker', ['compose', 'down'], { cwd: ROOT, stdio: 'inherit' });
} else {
  console.log('The stack is still running: http://localhost:8080. To stop it: docker compose down');
}

process.exit(passed === results.length ? 0 : 1);
