#!/usr/bin/env tsx
// scripts/seed-snapshot.ts
//
// Import/export Firestore + Auth snapshots for fast dev environment setup.
//
// Usage:
//   npx tsx scripts/seed-snapshot.ts export [--out snapshots/demo.json]
//   npx tsx scripts/seed-snapshot.ts import [--file snapshots/demo.json]
//   npx tsx scripts/seed-snapshot.ts generate [--profile demo] [--out snapshots/demo.json]
//
// `generate` = run full seed.ts then auto-export.
// `export`   = dump current emulator state to JSON.
// `import`   = load JSON snapshot into running emulator (fast batch writes).
/* eslint-disable no-console */

import { initializeApp, getApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

interface SnapshotMeta {
  version: string;
  generatedAt: string;
  profile: string;
  stats: {
    authUsers: number;
    collections: number;
    documents: number;
  };
}

interface SnapshotAuthUser {
  uid: string;
  email: string;
  displayName?: string;
  disabled: boolean;
  customClaims?: Record<string, unknown>;
  passwordHash?: string;
  passwordSalt?: string;
}

interface SnapshotDocument {
  path: string; // e.g. "organizations/gastroo-core-org"
  data: Record<string, unknown>;
}

interface Snapshot {
  meta: SnapshotMeta;
  auth: SnapshotAuthUser[];
  firestore: SnapshotDocument[];
}

// ── Firebase init ────────────────────────────────────────────────────────────

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'gastroo-4f0a3';
const app = getApps().length ? getApp() : initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────────────────────────

const SNAPSHOT_DIR = path.resolve(__dirname, '..', 'snapshots');
const DEFAULT_FILE = path.join(SNAPSHOT_DIR, 'demo.json');
const MAX_BATCH = 450; // Firestore batch limit is 500, keep margin
const KNOWN_SUBCOLLECTIONS: Record<string, string[]> = {
  organizations: ['restaurants', 'integrations', 'files', 'promotions', 'events'],
  'organizations/*/restaurants': ['sections', 'tables', 'menuCategories', 'menuItems', 'shifts', 'todoTasks', 'ingredients', 'recipes', 'bills'],
  users: ['memberships', 'cv', 'favoriteRestaurants', 'favoriteMenuItems'],
};

/** Serialize Firestore-specific types to plain JSON. */
function serializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (val instanceof Timestamp) return { __type: 'Timestamp', _seconds: val.seconds, _nanoseconds: val.nanoseconds };
  if (val instanceof Date) return { __type: 'Timestamp', _seconds: Math.floor(val.getTime() / 1000), _nanoseconds: 0 };
  if (Array.isArray(val)) return val.map(serializeValue);
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return val;
}

/** Deserialize back to Firestore-compatible types. */
function deserializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map(deserializeValue);
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.__type === 'Timestamp' && typeof obj._seconds === 'number') {
      return new Timestamp(obj._seconds as number, (obj._nanoseconds as number) || 0);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deserializeValue(v);
    }
    return out;
  }
  return val;
}

function resolveSubcollections(parentPath: string): string[] {
  // Direct match: "organizations" → ['restaurants', 'integrations', ...]
  if (KNOWN_SUBCOLLECTIONS[parentPath]) {
    return KNOWN_SUBCOLLECTIONS[parentPath];
  }
  // Wildcard match: "organizations/abc/restaurants" → match "organizations/*/restaurants"
  const parts = parentPath.split('/');
  if (parts.length >= 3) {
    const wildcardKey = `${parts[0]}/*/${parts[2]}`;
    if (KNOWN_SUBCOLLECTIONS[wildcardKey]) {
      return KNOWN_SUBCOLLECTIONS[wildcardKey];
    }
  }
  return [];
}

// ── Export ────────────────────────────────────────────────────────────────────

async function exportSnapshot(outFile: string): Promise<void> {
  console.log('📤 Exporting Firestore + Auth from emulator...');
  const documents: SnapshotDocument[] = [];

  // 1. Export Auth users
  const authUsers: SnapshotAuthUser[] = [];
  let nextPageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    for (const user of result.users) {
      authUsers.push({
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName,
        disabled: user.disabled,
        customClaims: user.customClaims as Record<string, unknown> | undefined,
      });
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`  Auth users: ${authUsers.length}`);

  // 2. Recursively export Firestore collections
  const topCollections = ['organizations', 'users', 'bookings', 'activeSessions', 'loyaltyCards', '_seed'];

  async function exportCollection(collectionPath: string, depth: number = 0): Promise<void> {
    const indent = '  '.repeat(depth + 1);
    const snap = await db.collection(collectionPath).get();
    if (snap.empty) return;

    console.log(`${indent}${collectionPath}: ${snap.size} docs`);

    for (const docSnap of snap.docs) {
      const docPath = `${collectionPath}/${docSnap.id}`;
      documents.push({
        path: docPath,
        data: serializeValue(docSnap.data()) as Record<string, unknown>,
      });

      // Determine collection name for subcollection lookup
      const subcollNames = resolveSubcollections(collectionPath);
      for (const subName of subcollNames) {
        await exportCollection(`${docPath}/${subName}`, depth + 1);
      }
    }
  }

  for (const col of topCollections) {
    await exportCollection(col);
  }

  // 3. Build snapshot
  const collectionNames = new Set(documents.map((d) => d.path.split('/').filter((_, i) => i % 2 === 0).join('/')));
  const snapshot: Snapshot = {
    meta: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      profile: process.env.SEED_PROFILE || 'demo',
      stats: {
        authUsers: authUsers.length,
        collections: collectionNames.size,
        documents: documents.length,
      },
    },
    auth: authUsers,
    firestore: documents,
  };

  // 4. Write to file
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2), 'utf-8');
  const sizeMB = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(1);
  console.log(`\n✅ Snapshot exported: ${outFile}`);
  console.log(`   ${authUsers.length} auth users, ${documents.length} documents, ${sizeMB} MB`);
}

// ── Import ───────────────────────────────────────────────────────────────────

async function importSnapshot(inFile: string): Promise<void> {
  console.log(`📥 Importing snapshot from ${inFile}...`);

  if (!fs.existsSync(inFile)) {
    console.error(`❌ File not found: ${inFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inFile, 'utf-8');
  const snapshot: Snapshot = JSON.parse(raw);

  console.log(`   Version: ${snapshot.meta.version}`);
  console.log(`   Generated: ${snapshot.meta.generatedAt}`);
  console.log(`   Profile: ${snapshot.meta.profile}`);
  console.log(`   Auth users: ${snapshot.meta.stats.authUsers}`);
  console.log(`   Documents: ${snapshot.meta.stats.documents}`);

  // 1. Import Auth users
  console.log('\n🔐 Importing Auth users...');
  let authCreated = 0;
  let authSkipped = 0;
  for (const user of snapshot.auth) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        disabled: user.disabled,
        // Emulator doesn't verify passwords, so set a default
        password: 'Snapshot123!',
      });
      if (user.customClaims && Object.keys(user.customClaims).length > 0) {
        await auth.setCustomUserClaims(user.uid, user.customClaims);
      }
      authCreated++;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/uid-already-exists' || code === 'auth/email-already-exists') {
        authSkipped++;
      } else {
        console.warn(`  ⚠️ Auth user ${user.email}: ${(err as Error).message}`);
      }
    }
  }
  console.log(`   Created: ${authCreated}, Skipped (existing): ${authSkipped}`);

  // 2. Import Firestore documents in batches
  console.log('\n🗄️  Importing Firestore documents...');
  const docs = snapshot.firestore;
  let written = 0;

  for (let i = 0; i < docs.length; i += MAX_BATCH) {
    const chunk = docs.slice(i, i + MAX_BATCH);
    const batch = db.batch();

    for (const doc of chunk) {
      const parts = doc.path.split('/');
      const docId = parts.pop()!;
      const collectionPath = parts.join('/');
      const ref = db.collection(collectionPath).doc(docId);
      batch.set(ref, deserializeValue(doc.data) as Record<string, unknown>, { merge: true });
    }

    await batch.commit();
    written += chunk.length;

    // Progress every 1000 docs
    if (written % 2000 < MAX_BATCH) {
      console.log(`   ${written}/${docs.length} documents...`);
    }
  }

  console.log(`\n✅ Import complete: ${authCreated} auth users, ${written} documents`);
}

// ── Generate ─────────────────────────────────────────────────────────────────

async function generate(profile: string, outFile: string): Promise<void> {
  console.log(`🔄 Generating snapshot (profile: ${profile})...`);
  console.log('   Step 1/2: Running full seed...\n');

  // Run seed.ts as subprocess
  const seedCmd = `NEXT_PUBLIC_USE_EMULATORS=true SEED_PROFILE=${profile} npx tsx scripts/seed.ts`;
  try {
    execSync(seedCmd, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, SEED_PROFILE: profile },
    });
  } catch {
    console.error('❌ Seed failed. Aborting snapshot generation.');
    process.exit(1);
  }

  console.log('\n   Step 2/2: Exporting to snapshot...\n');
  await exportSnapshot(outFile);
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i + 1]) {
      flags[args[i].replace('--', '')] = args[i + 1];
      i++;
    }
  }

  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs();
  const file = flags.file || flags.out || DEFAULT_FILE;
  const profile = flags.profile || process.env.SEED_PROFILE || 'demo';

  switch (command) {
    case 'export':
      await exportSnapshot(file);
      break;
    case 'import':
      await importSnapshot(file);
      break;
    case 'generate':
      await generate(profile, file);
      break;
    default:
      console.log(`
Usage:
  npx tsx scripts/seed-snapshot.ts <command> [options]

Commands:
  export     Export current emulator state to JSON snapshot
  import     Import JSON snapshot into running emulator
  generate   Run full seed then export snapshot

Options:
  --out <file>      Output file (default: snapshots/demo.json)
  --file <file>     Input file for import (default: snapshots/demo.json)
  --profile <name>  Seed profile: core|demo|integration|all (default: demo)

Examples:
  npx tsx scripts/seed-snapshot.ts generate --profile all --out snapshots/all.json
  npx tsx scripts/seed-snapshot.ts import --file snapshots/demo.json
  npx tsx scripts/seed-snapshot.ts export --out snapshots/current.json
`);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Snapshot failed:', e);
  process.exit(1);
});
