// scripts/seed-auth.ts
//
// Legacy wrapper: seed auth users from unified seed source.
// Prefer: npx tsx scripts/seed.ts (single source for Auth + Firestore).

import { initializeApp, getApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createNodeLogger, installConsoleDecorators } from './helpers/node-logger.mjs';
import { UNIFIED_SEED_SOURCE } from './seeds/source';

installConsoleDecorators('seed-auth');
const log = createNodeLogger('seed-auth');

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const app = getApps().length ? getApp() : initializeApp({ projectId: UNIFIED_SEED_SOURCE.projectId });
const auth = getAuth(app);

const USERS = UNIFIED_SEED_SOURCE.authUsers;

async function upsertUser(email: string, password: string, displayName: string) {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.deleteUser(existing.uid);
  } catch {
    // not found
  }

  const created = await auth.createUser({
    email,
    password,
    displayName,
    emailVerified: true,
  });

  return created.uid;
}

async function main() {
  log.banner('Seed Auth Emulator users');
  log.stage('Tworzenie kont testowych');
  log.warn('Legacy command: prefer `npx tsx scripts/seed.ts` for unified seeding.');
  for (const u of USERS) {
    const uid = await upsertUser(u.email, u.password, u.displayName);
    console.log(`✅ ${u.email} → ${uid}`);
  }
  log.ok('Auth seed complete.');
}

main().catch((e) => {
  console.error('❌ Auth seed failed:', e);
  process.exit(1);
});

