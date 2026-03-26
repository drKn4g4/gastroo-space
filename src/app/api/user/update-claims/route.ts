import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await req.json();
  const { isGastronaut } = body;

  if (typeof isGastronaut !== 'boolean') {
    return NextResponse.json({ error: 'isGastronaut must be a boolean' }, { status: 400 });
  }

  // Preserve existing claims (e.g. organization) while updating isGastronaut
  const userRecord = await adminAuth.getUser(uid);
  const existingClaims = userRecord.customClaims ?? {};

  await adminAuth.setCustomUserClaims(uid, {
    ...existingClaims,
    isGastronaut,
  });

  return NextResponse.json({ ok: true });
}
