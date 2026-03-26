import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { adminAuth } from '@/lib/firebase/admin';

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function requireSeedAdmin(req: Request): Promise<NextResponse | null> {
  const expectedKey = process.env.SEED_ADMIN_KEY;
  const providedKey = req.headers.get('x-seed-admin-key') ?? '';
  if (expectedKey && providedKey && safeEqual(providedKey, expectedKey)) return null;

  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const requireClaim = process.env.SEED_REQUIRE_ADMIN_CLAIM === 'true';
    if (requireClaim) {
      const claimName = process.env.SEED_ADMIN_CLAIM || 'seedAdmin';
      if (!(decoded as Record<string, unknown>)[claimName]) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return null;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
