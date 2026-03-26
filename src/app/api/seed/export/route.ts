import { NextRequest } from 'next/server';
import { requireSeedAdmin } from '../_lib/auth';
import { adminDb } from '@/lib/firebase/admin';
import {
  buildSeedExportPayload,
  getRequestedCollections,
  type SeedCollectionProfile,
  type SeedCollections,
} from '../_lib/seed-format';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const unauthorized = await requireSeedAdmin(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const requestedCollections = getRequestedCollections(url);
  const collections =
    requestedCollections.length > 0
      ? requestedCollections
      : (await adminDb.listCollections()).map((collectionRef) => collectionRef.id).sort((a, b) => a.localeCompare(b));
  const requestedProfile = (url.searchParams.get('profile') ?? '').trim();
  const profile: SeedCollectionProfile | undefined =
    requestedProfile === 'core' || requestedProfile === 'demo' || requestedProfile === 'integration'
      ? requestedProfile
      : undefined;
  const out: SeedCollections = {};

  for (const col of collections) {
    const snap = await adminDb.collection(col).get();
    out[col] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  }

  const body = JSON.stringify(buildSeedExportPayload(out, collections, new Date(), profile), null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="seed-export.json"',
    },
  });
}
