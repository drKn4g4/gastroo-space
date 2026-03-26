import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { google } from 'googleapis';
import { Readable } from 'stream';
import {
  DriveListFilesSchema,
  DriveGetFileSchema,
  DriveUploadReportCsvSchema,
  DriveUploadMenuImageSchema,
  DriveDeleteFileSchema
} from '../validation/drive';
import {
  isIntegrationMockMode,
  getAuthenticatedClient,
  assertOrganizationAccess,
  sanitizeFileName,
  extFromMimeType,
  buildDriveImageUrl,
  nowIso
} from './utils';
import { listMockDriveFiles } from './mock';

export const driveListFiles = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { orgId, folderId } = DriveListFilesSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    const files = await listMockDriveFiles({ uid: request.auth.uid, orgId, folderId });
    return { files };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime, size, webContentLink, thumbnailLink)',
    orderBy: 'folder, name',
  });

  return { files: res.data.files ?? [] };
});

export const driveGetFile = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { fileId, orgId } = DriveGetFileSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    await assertOrganizationAccess(request.auth.uid, orgId);
    return {
      file: {
        id: fileId,
        name: `mock-file-${fileId}`,
        mimeType: 'application/octet-stream',
        size: '1024',
        modifiedTime: nowIso(),
      },
    };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, size, description, webContentLink, thumbnailLink, parents',
  });

  return { file: res.data };
});

export const driveUploadReportCsv = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { orgId, fileName, csvContent, folderId } = DriveUploadReportCsvSchema.parse(request.data);

  await assertOrganizationAccess(request.auth.uid, orgId);

  const safeName = `${sanitizeFileName(fileName)}.csv`;

  if (isIntegrationMockMode()) {
    return { fileId: `mock-report-${Date.now()}`, name: safeName };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);
  const drive = google.drive({ version: 'v3', auth });

  const readable = new Readable();
  readable.push(csvContent);
  readable.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: folderId ? [folderId] : undefined,
      mimeType: 'text/csv',
    },
    media: { mimeType: 'text/csv', body: readable },
    fields: 'id, name',
  } as any);

  return { fileId: res.data.id, name: res.data.name };
});

export const driveUploadMenuImage = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { orgId, fileName, mimeType, base64Data, folderId } = DriveUploadMenuImageSchema.parse(request.data);

  await assertOrganizationAccess(request.auth.uid, orgId);

  const ext = extFromMimeType(mimeType);
  const safeName = `${sanitizeFileName(fileName)}.${ext}`;

  if (isIntegrationMockMode()) {
    const mockId = `mock-img-${Date.now()}`;
    return { fileId: mockId, name: safeName, url: buildDriveImageUrl(mockId) };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);
  const drive = google.drive({ version: 'v3', auth });

  const buffer = Buffer.from(base64Data, 'base64');
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: folderId ? [folderId] : undefined,
      mimeType,
    },
    media: { mimeType, body: readable },
    fields: 'id, name',
  } as any);

  const fileId = res.data.id!;
  return { fileId, name: res.data.name, url: buildDriveImageUrl(fileId) };
});

export const driveDeleteFile = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { fileId } = DriveDeleteFileSchema.parse(request.data);

  if (isIntegrationMockMode()) {
    return { success: true };
  }

  const auth = await getAuthenticatedClient(request.auth.uid);
  const drive = google.drive({ version: 'v3', auth });

  await drive.files.delete({ fileId });

  return { success: true };
});
