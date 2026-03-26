import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from '../firebaseAdmin';
import { DriveConnectSchema } from '../validation/drive';
import { isIntegrationMockMode, getOAuth2Client, getStoredTokens } from './utils';

export const driveConnect = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { code, orgId, rootFolderId } = DriveConnectSchema.parse(request.data);

  const now = admin.firestore.FieldValue.serverTimestamp();

  if (isIntegrationMockMode()) {
    await admin.firestore().doc(`users/${request.auth.uid}/integrations/drive`).set({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 1000 * 60 * 60 * 24 * 365,
      connected_at: now,
      scope: 'mock-drive-scope',
      mockMode: true,
    }, { merge: true });

    if (orgId) {
      await admin.firestore().doc(`organizations/${orgId}/integrations/googleDrive`).set({
        connected: true,
        status: 'connected',
        lastSyncAt: now,
        updatedAt: now,
        createdAt: now,
        updatedBy: request.auth.uid,
        mockMode: true,
      }, { merge: true });
    }

    return { success: true, orgId: orgId || null, rootFolderId: rootFolderId || null };
  }

  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);

  await admin.firestore().doc(`users/${request.auth.uid}/integrations/drive`).set({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    connected_at: now,
    scope: tokens.scope,
  });

  if (orgId) {
    await admin.firestore().doc(`organizations/${orgId}/integrations/googleDrive`).set({
      connected: true,
      status: 'connected',
      lastSyncAt: now,
      updatedAt: now,
      createdAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
  }

  return { success: true, orgId: orgId || null, rootFolderId: rootFolderId || null };
});

export const driveDisconnect = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  await admin.firestore().doc(`users/${request.auth.uid}/integrations/drive`).delete();
  return { success: true };
});

export const driveGetStatus = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
  const tokens = await getStoredTokens(request.auth.uid);
  return { connected: !!tokens };
});
