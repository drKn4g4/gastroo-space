import { HttpsError } from 'firebase-functions/v2/https';
import { admin } from '../firebaseAdmin';
import { assertOrganizationAccess, nowIso } from './utils';

export function mockFolderId(kind: 'root' | 'menu' | 'staff', orgId: string) {
  return `mock-${kind}-${orgId}`;
}

export function mockReportsFolderId(kind: 'reports' | 'owner-logs' | 'schedule', orgId: string) {
  return `mock-${kind}-${orgId}`;
}

export function mockConfigId(orgId: string) {
  return `mock-config-${orgId}`;
}

export async function ensureDriveFoldersMock(params: {
  uid: string;
  orgId: string;
  preferredRootFolderId?: string;
}) {
  const integrationRef = admin.firestore().doc(`organizations/${params.orgId}/integrations/googleDrive`);
  const integrationSnap = await integrationRef.get();
  const integrationData = (integrationSnap.data() ?? {}) as {
    rootFolderId?: string|null;
    menuFolderId?: string|null;
    staffFolderId?: string|null;
    reportsFolderId?: string|null;
    ownerLogsFolderId?: string|null;
    scheduleReportsFolderId?: string|null;
  };

  const rootFolderId = integrationData.rootFolderId?.trim() || (params.preferredRootFolderId?.trim() || mockFolderId('root', params.orgId));
  const menuFolderId = integrationData.menuFolderId?.trim() || mockFolderId('menu', params.orgId);
  const staffFolderId = integrationData.staffFolderId?.trim() || mockFolderId('staff', params.orgId);
  const reportsFolderId = integrationData.reportsFolderId?.trim() || mockReportsFolderId('reports', params.orgId);
  const ownerLogsFolderId = integrationData.ownerLogsFolderId?.trim() || mockReportsFolderId('owner-logs', params.orgId);
  const scheduleReportsFolderId = integrationData.scheduleReportsFolderId?.trim() || mockReportsFolderId('schedule', params.orgId);

  const now = admin.firestore.FieldValue.serverTimestamp();
  await integrationRef.set({
    connected: true,
    status: 'connected',
    serviceMode: 'sync',
    rootFolderId,
    menuFolderId,
    staffFolderId,
    reportsFolderId,
    ownerLogsFolderId,
    scheduleReportsFolderId,
    lastSyncAt: now,
    updatedAt: now,
    createdAt: integrationSnap.exists ? integrationSnap.data()?.createdAt ?? now : now,
    updatedBy: params.uid,
    mockMode: true,
  }, { merge: true });

  return { rootFolderId, menuFolderId, staffFolderId, reportsFolderId, ownerLogsFolderId, scheduleReportsFolderId };
}

export async function listMockDriveFiles(params: {
  uid: string;
  orgId: string;
  folderId: string;
}) {
  await assertOrganizationAccess(params.uid, params.orgId);
  const integrationSnap = await admin.firestore().doc(`organizations/${params.orgId}/integrations/googleDrive`).get();
  const integration = (integrationSnap.data() ?? {}) as {
    rootFolderId?: string|null;
    menuFolderId?: string|null;
    staffFolderId?: string|null;
    reportsFolderId?: string|null;
    ownerLogsFolderId?: string|null;
    scheduleReportsFolderId?: string|null;
  };

  const rootFolderId = integration.rootFolderId?.trim() || mockFolderId('root', params.orgId);
  const menuFolderId = integration.menuFolderId?.trim() || mockFolderId('menu', params.orgId);
  const staffFolderId = integration.staffFolderId?.trim() || mockFolderId('staff', params.orgId);
  const reportsFolderId = integration.reportsFolderId?.trim() || mockReportsFolderId('reports', params.orgId);
  const ownerLogsFolderId = integration.ownerLogsFolderId?.trim() || mockReportsFolderId('owner-logs', params.orgId);
  const scheduleReportsFolderId = integration.scheduleReportsFolderId?.trim() || mockReportsFolderId('schedule', params.orgId);
  const requested = params.folderId.trim();

  if (requested === rootFolderId) {
    return [
      { id: menuFolderId, name: 'menu', mimeType: 'application/vnd.google-apps.folder', modifiedTime: nowIso() },
      { id: staffFolderId, name: 'staff', mimeType: 'application/vnd.google-apps.folder', modifiedTime: nowIso() },
      { id: mockConfigId(params.orgId), name: 'config.json', mimeType: 'application/json', modifiedTime: nowIso(), size: '256' },
      { id: reportsFolderId, name: 'reports', mimeType: 'application/vnd.google-apps.folder', modifiedTime: nowIso() },
    ];
  }

  if (requested === reportsFolderId) {
    return [
      { id: ownerLogsFolderId, name: 'owner-logs', mimeType: 'application/vnd.google-apps.folder', modifiedTime: nowIso() },
      { id: scheduleReportsFolderId, name: 'schedule', mimeType: 'application/vnd.google-apps.folder', modifiedTime: nowIso() },
    ];
  }

  if (requested === menuFolderId) {
    const filesSnap = await admin.firestore()
      .collection(`organizations/${params.orgId}/files`)
      .where('kind', '==', 'menu-image')
      .limit(100).get();

    return filesSnap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.fileName || `menu-image-${docSnap.id}`,
        mimeType: data.mimeType || 'image/jpeg',
        size: typeof data.size === 'number' ? String(data.size) : undefined,
        modifiedTime: data.updatedAt?.toDate()?.toISOString() ?? nowIso(),
        webContentLink: `https://drive.google.com/file/d/${docSnap.id}/view`,
      };
    });
  }

  if (requested === staffFolderId) return [];

  throw new HttpsError('permission-denied', 'Only organization mock folders can be listed');
}
