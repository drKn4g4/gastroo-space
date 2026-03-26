// scripts/drive-smoketest.ts
//
// Minimalny smoke-test połączenia z Google Drive via ADC (Application Default Credentials).
//
// Wymaga:
// - GDRIVE_SEED_FOLDER_ID=<folderId>
// - oraz jednego z:
//   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//   - albo `gcloud auth application-default login`

import { GoogleAuth } from 'google-auth-library';
import { createNodeLogger, installConsoleDecorators } from './helpers/node-logger.mjs';

installConsoleDecorators('drive-smoketest');
const log = createNodeLogger('drive-smoketest');

async function main() {
  log.banner('Drive smoketest');
  const folderId = process.env.GDRIVE_SEED_FOLDER_ID;
  if (!folderId) {
    log.warn('GDRIVE_SEED_FOLDER_ID not set -> skipping Drive smoketest');
    return;
  }

  log.stage('Autoryzacja i listing plików');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] });
  const client = await auth.getClient();
  const headers = (await client.getRequestHeaders()) as unknown as Record<string, string>;

  const q = `'${folderId}' in parents and trashed = false`;
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', '5');
  url.searchParams.set('fields', 'files(id,name,mimeType)');

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`Drive smoketest failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { files?: Array<{ id: string; name: string; mimeType: string }> };
  const files = data.files ?? [];

  log.ok(`Drive smoketest OK (folder=${folderId}) - files: ${files.length}`);
  for (const f of files) {
    console.log(`   - ${f.name} (${f.id}) [${f.mimeType}]`);
  }
}

main().catch((e) => {
  console.error('❌ Drive smoketest failed:', e);
  process.exit(1);
});

