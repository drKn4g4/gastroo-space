import { NextRequest, NextResponse } from 'next/server';
import { requireSeedAdmin } from '../_lib/auth';
import { getDrive } from '../_lib/drive';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const unauthorized = await requireSeedAdmin(req);
  if (unauthorized) return unauthorized;

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const folderId = process.env.GDRIVE_SEED_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: 'GDRIVE_SEED_FOLDER_ID is not set' }, { status: 500 });
  }

  const drive = getDrive();
  const buf = Buffer.from(await file.arrayBuffer());
  const driveRes = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId],
    },
    media: {
      mimeType: file.type || 'application/octet-stream',
      body: buf,
    },
    fields: 'id, name',
  });

  // (Opcjonalnie) zapis metadanych w Firestore lub Firestorage
  // ...

  return NextResponse.json({ id: driveRes.data.id, name: driveRes.data.name });
}
