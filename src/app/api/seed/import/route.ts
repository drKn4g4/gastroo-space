import { NextRequest, NextResponse } from 'next/server';
import { requireSeedAdmin } from '../_lib/auth';
import { getDrive } from '../_lib/drive';
import { adminDb } from '@/lib/firebase/admin';
import { resolveCollectionsByProfile, resolveSeedCollections } from '../_lib/seed-format';
import {
  CanonicalSeedFileSchema,
  CollectionProfileSchema,
  LegacySeedFileSchema,
  type ImportMode,
  SeedImportRequestSchema,
} from '../_lib/seed-schema';

export const runtime = 'nodejs';

type ImportFailure = {
  collection: string;
  id: string | null;
  reason: string;
};

type ImportSummary = {
  requestedCollections: string[];
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
};

export async function POST(req: NextRequest) {
  const unauthorized = await requireSeedAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = SeedImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request payload',
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
      { status: 400 },
    );
  }

  const { seedId, collections, overwrite, mode, profile } = parsed.data;

  // Pobierz plik seeda z Google Drive
  const drive = getDrive();
  const fileRes = await drive.files.get(
    { fileId: seedId, alt: 'media' },
    { responseType: 'text' },
  );
  const raw = fileRes.data as string;
  let seed: unknown;
  try {
    seed = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: 'Seed file is not valid JSON' }, { status: 400 });
  }

  const canonicalValid = CanonicalSeedFileSchema.safeParse(seed).success;
  const legacyValid = LegacySeedFileSchema.safeParse(seed).success;
  if (!canonicalValid && !legacyValid) {
    return NextResponse.json({ error: 'Seed file format is invalid' }, { status: 400 });
  }

  const seedCollections = resolveSeedCollections(seed);

  const selectedProfile = profile ? CollectionProfileSchema.parse(profile) : undefined;

  const selectedCollections = Array.isArray(collections) && collections.length > 0
    ? collections
    : selectedProfile
      ? resolveCollectionsByProfile(selectedProfile)
      : Object.keys(seedCollections);

  if (selectedCollections.length === 0) {
    return NextResponse.json({ error: 'No collections found in seed file' }, { status: 400 });
  }

  const failures: ImportFailure[] = [];
  const summary: ImportSummary = {
    requestedCollections: selectedCollections,
    processed: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
  };

  const fail = (collection: string, id: string | null, reason: string) => {
    summary.failed += 1;
    failures.push({ collection, id, reason });
  };

  const shouldAbort = (importMode: ImportMode) => importMode === 'strict' && summary.failed > 0;

  // Import do Firestore (tylko wybrane kolekcje)
  for (const col of selectedCollections) {
    const docs = seedCollections[col];
    if (!docs) {
      const reason = `Collection '${col}' not found in seed file`;
      if (mode === 'strict') {
        fail(col, null, reason);
        break;
      }
      summary.skipped += 1;
      continue;
    }

    for (const doc of docs) {
      summary.processed += 1;
      const { id, ...data } = doc ?? {};
      if (!id) {
        fail(col, null, 'Document id is required');
        if (shouldAbort(mode)) break;
        continue;
      }
      const ref = adminDb.collection(col).doc(String(id));
      try {
        if (overwrite) await ref.set(data, { merge: false });
        else await ref.create(data);
        summary.imported += 1;
      } catch (error) {
        fail(col, String(id), error instanceof Error ? error.message : 'Unknown Firestore error');
        if (shouldAbort(mode)) break;
      }
    }

    if (shouldAbort(mode)) break;
  }

  if (mode === 'strict' && summary.failed > 0) {
    return NextResponse.json(
      {
        error: 'Seed import failed in strict mode',
        mode,
        profile: selectedProfile ?? null,
        summary,
        failures,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: summary.failed === 0,
    mode,
    profile: selectedProfile ?? null,
    summary,
    failures,
  });
}
