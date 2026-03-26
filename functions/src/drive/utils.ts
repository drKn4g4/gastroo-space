import { HttpsError } from 'firebase-functions/v2/https';
import { admin } from '../firebaseAdmin';
import { google } from 'googleapis';

export const MOCK_INTEGRATIONS_ON_EMULATOR = (process.env.MOCK_INTEGRATIONS_ON_EMULATOR ?? 'true') !== 'false';

export function isIntegrationMockMode() {
  const forceOn = process.env.MOCK_INTEGRATIONS === 'true';
  const forceOff = process.env.MOCK_INTEGRATIONS === 'false';
  if (forceOn) return true;
  if (forceOff) return false;

  const isEmulator =
    process.env.FUNCTIONS_EMULATOR === 'true'
    || Boolean(process.env.FIRESTORE_EMULATOR_HOST)
    || Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

  return MOCK_INTEGRATIONS_ON_EMULATOR && isEmulator;
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI,
  );
}

export async function getStoredTokens(uid: string) {
  const ref = admin.firestore().doc(`users/${uid}/integrations/drive`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as { access_token: string; refresh_token: string; expiry_date: number };
}

export async function getAuthenticatedClient(uid: string) {
  const tokens = await getStoredTokens(uid);
  if (!tokens) throw new HttpsError('failed-precondition', 'Google Drive not connected');

  const auth = getOAuth2Client();
  auth.setCredentials(tokens);

  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60_000) {
    const { credentials } = await auth.refreshAccessToken();
    await admin.firestore().doc(`users/${uid}/integrations/drive`).update({
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    });
    auth.setCredentials(credentials);
  }
  return auth;
}

export async function assertOrganizationAccess(uid: string, orgId: string) {
  const orgRef = admin.firestore().doc(`organizations/${orgId}`);
  const memberRef = admin.firestore().doc(`organizations/${orgId}/members/${uid}`);
  const membershipRef = admin.firestore().doc(`users/${uid}/memberships/${orgId}`);
  const [orgSnap, memberSnap, membershipSnap] = await Promise.all([
    orgRef.get(),
    memberRef.get(),
    membershipRef.get(),
  ]);

  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organization not found');
  }

  const orgData = (orgSnap.data() ?? {}) as { owner?: string; ownerUid?: string };
  const isOwner = orgData.owner === uid || orgData.ownerUid === uid;
  const hasLegacyMembership = memberSnap.exists;
  const hasActiveMembership = membershipSnap.exists
    && membershipSnap.data()?.status === 'active';

  if (isOwner || hasLegacyMembership || hasActiveMembership) {
    return orgSnap;
  }

  throw new HttpsError('permission-denied', 'No access to this organization');
}

export function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function extFromMimeType(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

export function buildDriveImageUrl(fileId: string) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function nowIso() {
  return new Date().toISOString();
}
