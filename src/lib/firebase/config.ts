import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  connectFirestoreEmulator, 
  Firestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  onSnapshot as firebaseOnSnapshot,
  Query,
  QuerySnapshot,
  FirestoreError,
  DocumentReference,
  DocumentSnapshot,
  CollectionReference
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern using globalThis for Next.js (HMR/Turbopack/SSR safe)
declare global {
  // eslint-disable-next-line no-var
  var __firebase_app: FirebaseApp | undefined;
  // eslint-disable-next-line no-var
  var __firebase_db: Firestore | undefined;
  // eslint-disable-next-line no-var
  var __firebase_auth: Auth | undefined;
  // eslint-disable-next-line no-var
  var __firebase_storage: FirebaseStorage | undefined;
  // eslint-disable-next-line no-var
  var __firebase_unsubs: Set<() => void> | undefined;
}

type FirebaseGlobals = {
  __firebase_app?: FirebaseApp;
  __firebase_db?: Firestore;
  __firebase_auth?: Auth;
  __firebase_storage?: FirebaseStorage;
  __firebase_unsubs?: Set<() => void>;
};

const isBrowser = typeof window !== 'undefined';
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

// Guard: skip Firebase init when API key is missing (e.g. during Next.js build/prerender).
// This prevents `auth/invalid-api-key` crashes in CI/Cloud Build where client env vars
// may not be available at static generation time.
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

if (!hasFirebaseConfig) {
  // Build-time stub: Firebase SDK is not initialized.
  // Any runtime code path that actually needs Firebase will hit this only during
  // static prerender — client components re-initialize on hydration with real config.
  app = {} as FirebaseApp;
  db = {} as Firestore;
  auth = {} as Auth;
  storage = {} as FirebaseStorage;
} else if (process.env.NODE_ENV === 'development') {
  const g = globalThis as typeof globalThis & FirebaseGlobals;
  if (!g.__firebase_app) {
    // When switching between emulator/prod configs, stale persisted Auth state can trigger
    // noisy Auth emulator 400s (e.g. accounts:lookup during initialization). In dev, we
    // clear Firebase Auth persistence once per mode switch.
    if (isBrowser) {
      try {
        const key = '__gastroo_use_emulators';
        const next = useEmulators ? 'true' : 'false';
        const prev = window.localStorage.getItem(key);
        if (prev !== next) {
          window.localStorage.setItem(key, next);
          for (const k of Object.keys(window.localStorage)) {
            if (k.startsWith('firebase:authUser:')) window.localStorage.removeItem(k);
          }
          // Best-effort: remove Auth IndexedDB storage
          if (window.indexedDB?.deleteDatabase) {
            window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
          }
          console.log(`🧹 [Auth] Cleared persisted auth state (mode switch: ${prev ?? 'null'} → ${next})`);
        }
      } catch {
        // ignore
      }
    }

    console.log('📦 Initializing Firebase (Global Singleton)...');
    g.__firebase_app = initializeApp(firebaseConfig);
    
    // Clear all previous listeners if this is an HMR reload
    if (g.__firebase_unsubs) {
      console.log(`🧹 [Firestore] Cleaning up ${g.__firebase_unsubs.size} active listeners before reload...`);
      g.__firebase_unsubs.forEach((u) => { try { u(); } catch { /* ignore */ } });
      g.__firebase_unsubs.clear();
    } else {
      g.__firebase_unsubs = new Set();
    }

    // Keep persistent cache in browser (PWA/offline), fallback to memory cache outside browser.
    g.__firebase_db = initializeFirestore(g.__firebase_app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
      localCache: isBrowser
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache()
    });
    
    g.__firebase_auth = getAuth(g.__firebase_app);
    g.__firebase_storage = getStorage(g.__firebase_app);

    if (useEmulators) {
      console.log('🔥 Connecting to Firebase Emulators (127.0.0.1)...');
      connectFirestoreEmulator(g.__firebase_db, '127.0.0.1', 8080);
      connectAuthEmulator(g.__firebase_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectStorageEmulator(g.__firebase_storage, '127.0.0.1', 9199);
    }
  } else {
    // console.log('♻️ Using existing Firebase instances from Global Singleton');
  }
  app = g.__firebase_app;
  db = g.__firebase_db!;
  auth = g.__firebase_auth!;
  storage = g.__firebase_storage!;
} else {
  // Production
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
}

// Helper for safe onSnapshot with HMR cleanup
export function safeOnSnapshot<T>(
  query: Query<T> | DocumentReference<T> | CollectionReference<T>,
  onNext: (snapshot: QuerySnapshot<T> | DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void
) {
  const g = globalThis as any;
  // @ts-ignore - onSnapshot typing is complex, using any for the internal call
  const unsub = firebaseOnSnapshot(query, onNext, onError);
  if (process.env.NODE_ENV === 'development' && g.__firebase_unsubs) {
    g.__firebase_unsubs.add(unsub);
  }
  return () => {
    unsub();
    if (process.env.NODE_ENV === 'development' && g.__firebase_unsubs) {
      g.__firebase_unsubs.delete(unsub);
    }
  };
}

export { app, db, auth, storage };
export default app;

// ─── Test helpers ────────────────────────────────────────────────────────────
// Expose a lightweight ID-token getter on `window` for Playwright E2E tests.
// This is only registered in the browser context and is a no-op in SSR/Node.
if (isBrowser && (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_USE_EMULATORS === 'true')) {
  type E2ELoginPayload = {
    email: string;
    password: string;
    displayName?: string;
  };

  type WinExt = Window & {
    __gastroo_getIdToken?: () => Promise<string | null>;
    __gastroo_e2e_signIn?: (payload: E2ELoginPayload) => Promise<string | null>;
    __gastroo_e2e_signOut?: () => Promise<void>;
  };

  (window as WinExt).__gastroo_getIdToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  (window as WinExt).__gastroo_e2e_signIn = async ({ email, password, displayName }: E2ELoginPayload) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
        .catch(async (error: { code?: string }) => {
          if (error?.code !== 'auth/invalid-credential' && error?.code !== 'auth/user-not-found') {
            throw error;
          }
          return createUserWithEmailAndPassword(auth, email, password);
        });

      if (displayName && credential.user.displayName !== displayName) {
        await updateProfile(credential.user, { displayName });
      }

      window.localStorage.setItem('gastroo_has_logged_in', 'true');
      return credential.user.uid;
    } catch (error) {
      console.error('[E2E Auth] Sign-in failed', error);
      return null;
    }
  };

  (window as WinExt).__gastroo_e2e_signOut = async () => {
    await signOut(auth);
    window.localStorage.removeItem('gastroo_has_logged_in');
  };
}
