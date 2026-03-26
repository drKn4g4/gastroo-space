import { NextRequest, NextResponse } from 'next/server';
import { requireSeedAdmin } from '../_lib/auth';
import { getDrive } from '../_lib/drive';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const unauthorized = await requireSeedAdmin(req);
  if (unauthorized) return unauthorized;

  // Synchronizacja seedów z Google Drive do Firestorage (np. backup lub cache)
  const drive = getDrive();
  const folderId = process.env.GDRIVE_SEED_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: 'GDRIVE_SEED_FOLDER_ID is not set' }, { status: 500 });
  }
  const files = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
  });
  // ...tu logika kopiowania do Firestorage
  return NextResponse.json({ ok: true, files: files.data.files });
}
