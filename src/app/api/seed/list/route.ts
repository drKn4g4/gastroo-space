import { NextRequest, NextResponse } from 'next/server';
import { requireSeedAdmin } from '../_lib/auth';
import { getDrive } from '../_lib/drive';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const unauthorized = await requireSeedAdmin(req);
  if (unauthorized) return unauthorized;

  // Lista plików seedów na Google Drive
  const drive = getDrive();
  const folderId = process.env.GDRIVE_SEED_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: 'GDRIVE_SEED_FOLDER_ID is not set' }, { status: 500 });
  }
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime, size, mimeType)',
  });
  return NextResponse.json(res.data.files);
}
