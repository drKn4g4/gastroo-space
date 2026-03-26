'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';

type DiagnosticsState = {
  origin: string;
  hasFirebaseAuthLocalStorage: boolean;
  hasLoggedInMarker: boolean;
  authIndexedDbPresent: boolean;
  firestoreIndexedDbPresent: boolean;
  serviceWorkerControlled: boolean;
  pwaStandalone: boolean;
  visibility: DocumentVisibilityState;
};

const isDev = process.env.NODE_ENV === 'development';

function hasFirebaseAuthKey() {
  if (typeof window === 'undefined') return false;
  return Object.keys(window.localStorage).some((key) => key.startsWith('firebase:authUser:'));
}

async function probeIndexedDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return { authIndexedDbPresent: false, firestoreIndexedDbPresent: false };
  }

  const anyWindow = window as Window & {
    indexedDB: IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> };
  };

  if (typeof anyWindow.indexedDB.databases !== 'function') {
    return {
      authIndexedDbPresent: false,
      firestoreIndexedDbPresent: false,
    };
  }

  try {
    const dbs = await anyWindow.indexedDB.databases();
    const names = dbs.map((db) => String(db?.name ?? '').toLowerCase());
    return {
      authIndexedDbPresent: names.some((name) => name.includes('firebaselocalstoragedb')),
      firestoreIndexedDbPresent: names.some((name) => name.includes('firestore')),
    };
  } catch {
    return { authIndexedDbPresent: false, firestoreIndexedDbPresent: false };
  }
}

export default function DevSessionDiagnostics() {
  const { user } = useAuth();
  const [state, setState] = useState<DiagnosticsState | null>(null);

  useEffect(() => {
    if (!isDev || typeof window === 'undefined') return;

    let alive = true;

    const update = async () => {
      const indexedDb = await probeIndexedDb();
      if (!alive) return;

      setState({
        origin: window.location.origin,
        hasFirebaseAuthLocalStorage: hasFirebaseAuthKey(),
        hasLoggedInMarker: window.localStorage.getItem('gastroo_has_logged_in') === 'true',
        authIndexedDbPresent: indexedDb.authIndexedDbPresent,
        firestoreIndexedDbPresent: indexedDb.firestoreIndexedDbPresent,
        serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
        pwaStandalone: window.matchMedia('(display-mode: standalone)').matches,
        visibility: document.visibilityState,
      });
    };

    void update();
    const timer = window.setInterval(() => void update(), 5000);
    document.addEventListener('visibilitychange', update);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const authStatus = useMemo(() => {
    if (!user) return 'brak';
    return `${user.email ?? user.uid}`;
  }, [user]);

  if (!isDev || !state) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 1600,
        pointerEvents: 'none',
        width: 'min(28rem, calc(100vw - 2rem))',
        p: '0.75rem',
        borderRadius: '0.75rem',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={0.75}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
          DEV Session Diagnostics
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={`auth: ${authStatus}`} color={user ? 'success' : 'default'} />
          <Chip size="small" label={`origin: ${state.origin}`} />
          <Chip size="small" label={`visibility: ${state.visibility}`} />
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`auth-IDB: ${state.authIndexedDbPresent ? 'ok' : 'brak'}`}
            color={state.authIndexedDbPresent ? 'success' : 'warning'}
          />
          <Chip
            size="small"
            label={`auth-LS: ${state.hasFirebaseAuthLocalStorage ? 'ok' : 'brak'}`}
            color={state.hasFirebaseAuthLocalStorage ? 'success' : 'warning'}
          />
          <Chip
            size="small"
            label={`firestore-IDB: ${state.firestoreIndexedDbPresent ? 'ok' : 'brak'}`}
            color={state.firestoreIndexedDbPresent ? 'success' : 'warning'}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`SW: ${state.serviceWorkerControlled ? 'aktywny' : 'brak kontrolera'}`}
            color={state.serviceWorkerControlled ? 'success' : 'warning'}
          />
          <Chip
            size="small"
            label={`PWA: ${state.pwaStandalone ? 'standalone' : 'browser-tab'}`}
            color={state.pwaStandalone ? 'success' : 'default'}
          />
          <Chip
            size="small"
            label={`logged_in_marker: ${state.hasLoggedInMarker ? 'true' : 'false'}`}
            color={state.hasLoggedInMarker ? 'success' : 'default'}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
