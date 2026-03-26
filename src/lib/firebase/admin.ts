import * as admin from 'firebase-admin';

declare global {
  var __firebase_admin_app: admin.app.App | undefined;
}

const g = globalThis as typeof globalThis & { __firebase_admin_app?: admin.app.App };

if (!g.__firebase_admin_app) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT;

  const useEmulators =
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' ||
    !!process.env.FIRESTORE_EMULATOR_HOST ||
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

  g.__firebase_admin_app = useEmulators
    ? admin.initializeApp({ projectId })
    : admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
}

export const adminApp = g.__firebase_admin_app as admin.app.App;
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
