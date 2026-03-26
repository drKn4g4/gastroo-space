import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';

function run(cmd: string) {
  try {
    execSync(cmd, { stdio: 'ignore', shell: '/bin/zsh' });
  } catch {
    // best-effort cleanup only
  }
}

export default async function globalTeardown() {
  // IMPORTANT: webServer lifecycle is managed by Playwright itself.
  // Aggressive process killing here can terminate sibling processes and cause exit code 143.
  const aggressiveCleanup = process.env.PLAYWRIGHT_AGGRESSIVE_CLEANUP === 'true';

  if (aggressiveCleanup) {
    run('pkill -f "npm run dev:full" || true');
    run('pkill -f "next dev --turbopack" || true');
    run('pkill -f "firebase emulators:start" || true');
    run('for p in 5202 4400 4000 8080 9099 9199; do lsof -ti tcp:$p | xargs kill -TERM 2>/dev/null || true; done');
    run('sleep 1');
    run('for p in 5202 4400 4000 8080 9099 9199; do lsof -ti tcp:$p | xargs kill -KILL 2>/dev/null || true; done');
  }

  const tempLogs = [
    '/tmp/gastroo-devfull.log',
    '/tmp/gastroo-devfull-5202.log',
    '/tmp/gastroo-pl.html',
  ];

  for (const file of tempLogs) {
    if (!existsSync(file)) continue;
    try {
      unlinkSync(file);
    } catch {
      // ignore
    }
  }
}
