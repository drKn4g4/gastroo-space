import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from '../firebaseAdmin';
import { google, drive_v3 } from 'googleapis';
import { DriveProvisionSchema } from '../validation/drive';
import { isIntegrationMockMode, getAuthenticatedClient, assertOrganizationAccess } from './utils';
import { ensureDriveFoldersMock } from './mock';

async function ensureNamedFolder(drive: drive_v3.Drive, parentId: string, name: string) {
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });
  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }
  const folder = await drive.files.create({
    requestBody: { name, parentId: [parentId], mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return folder.data.id!;
}

async function ensureConfigFile(drive: drive_v3.Drive, rootFolderId: string, orgId: string) {
  const name = 'config.json';
  const existing = await drive.files.list({
    q: `'${rootFolderId}' in parents and name = '${name}' and trashed = false`,
    fields: 'files(id)',
  });
  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }
  const content = JSON.stringify({ orgId, createdAt: new Date().toISOString() });
  const file = await drive.files.create({
    requestBody: { name, parentId: [rootFolderId], mimeType: 'application/json' },
    media: { mimeType: 'application/json', body: content },
    fields: 'id',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return file.data.id!;
}

async function ensureDriveFolders(params: {
  uid: string;
  orgId: string;
  preferredRootFolderId?: string;
}) {
  const auth = await getAuthenticatedClient(params.uid);
  const drive = google.drive({ version: 'v3', auth });

  let rootFolderId = params.preferredRootFolderId?.trim();
  if (!rootFolderId) {
    const rootSearch = await drive.files.list({
      q: "name = 'Gastroo' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
    });
    if (rootSearch.data.files && rootSearch.data.files.length > 0) {
      rootFolderId = rootSearch.data.files[0].id!;
    } else {
      const rootFolder = await drive.files.create({
        requestBody: { name: 'Gastroo', mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id',
      });
      rootFolderId = rootFolder.data.id!;
    }
  }

  const orgFolderId = await ensureNamedFolder(drive, rootFolderId!, `Lokal – ${params.orgId}`);
  const menuFolderId = await ensureNamedFolder(drive, orgFolderId, 'menu');
  const staffFolderId = await ensureNamedFolder(drive, orgFolderId, 'staff');
  const reportsFolderId = await ensureNamedFolder(drive, orgFolderId, 'reports');
  const ownerLogsFolderId = await ensureNamedFolder(drive, reportsFolderId, 'owner-logs');
  const scheduleReportsFolderId = await ensureNamedFolder(drive, reportsFolderId, 'schedule');

  await ensureConfigFile(drive, orgFolderId, params.orgId);

  const now = admin.firestore.FieldValue.serverTimestamp();
  await admin.firestore().doc(`organizations/${params.orgId}/integrations/googleDrive`).set({
    connected: true,
    status: 'connected',
    serviceMode: 'sync',
    rootFolderId: orgFolderId,
    menuFolderId,
    staffFolderId,
    reportsFolderId,
    ownerLogsFolderId,
    scheduleReportsFolderId,
    lastSyncAt: now,
    updatedAt: now,
    createdAt: now,
    updatedBy: params.uid,
  }, { merge: true });

  return { rootFolderId: orgFolderId, menuFolderId, staffFolderId, reportsFolderId, ownerLogsFolderId, scheduleReportsFolderId };
}

export const driveProvision = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { orgId, rootFolderId } = DriveProvisionSchema.parse(request.data);

  await assertOrganizationAccess(request.auth.uid, orgId);

  if (isIntegrationMockMode()) {
    return ensureDriveFoldersMock({ uid: request.auth.uid, orgId, preferredRootFolderId: rootFolderId });
  }

  return ensureDriveFolders({ uid: request.auth.uid, orgId, preferredRootFolderId: rootFolderId });
});
