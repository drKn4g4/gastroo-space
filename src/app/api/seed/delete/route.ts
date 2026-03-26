import { NextRequest, NextResponse } from 'next/server';
import { requireSeedAdmin } from '../_lib/auth';
import { getDrive } from '../_lib/drive';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireSeedAdmin(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const seedId = url.searchParams.get('seedId');
  if (!seedId) return NextResponse.json({ error: 'seedId required' }, { status: 400 });
  const drive = getDrive();
  await drive.files.delete({ fileId: seedId });
  // (Opcjonalnie) usuń z Firestorage
  // ...
  return NextResponse.json({ ok: true });
}
