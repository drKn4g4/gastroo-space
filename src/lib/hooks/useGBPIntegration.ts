// src/lib/hooks/useGBPIntegration.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';
import type {
  GBPConnectRequest,
  GBPEnsureLocationRequest,
  GBPEnsureLocationResponse,
  GBPGetLocationsResponse,
  GBPStatusResponse,
} from '@/types/organization';

const GBP_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ?? '';
// Scopes for GBP Business Information
const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';

export type GBPStatus = GBPStatusResponse;

export function useGBPIntegration() {
  const fns = getFunctions(app, 'europe-west1');
  const [status, setStatus] = useState<GBPStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const getStatus = httpsCallable<void, GBPStatusResponse>(fns, 'gbpGetStatus');
      const result = await getStatus();
      setStatus(result.data);
    } catch (e) {
      console.error('gbpGetStatus error', e);
    } finally {
      setLoading(false);
    }
  }, [fns]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const connect = useCallback(async (orgId?: string) => {
    setConnecting(true);
    setError(null);
    try {
      const state = JSON.stringify({ orgId: orgId ?? '' });
      const params = new URLSearchParams({
        client_id: GBP_CLIENT_ID,
        redirect_uri: `${window.location.origin}/api/drive/callback`,
        response_type: 'code',
        scope: GBP_SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      const popup = window.open(authUrl, 'gbp-auth', 'width=600,height=700');

      if (!popup) {
        throw new Error('Nie udało się otworzyć okna autoryzacji GBP');
      }

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          window.removeEventListener('message', handleMessage);
          window.clearInterval(closeWatcher);
          popup.close();
        };

        const fail = (reason: unknown) => {
          cleanup();
          const message = reason instanceof Error ? reason.message : 'GBP connection failed';
          setError(message);
          setConnecting(false);
          reject(reason instanceof Error ? reason : new Error(message));
        };

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'DRIVE_AUTH_ERROR') {
            fail(new Error(event.data?.error ?? 'Autoryzacja GBP nie powiodła się'));
            return;
          }

          if (event.data?.type !== 'DRIVE_AUTH_SUCCESS') return;

          try {
            cleanup();
            const payload = typeof event.data?.state === 'string' ? JSON.parse(event.data.state) as { orgId?: string } : {};
            const gbpConnectFn = httpsCallable<GBPConnectRequest, { success: boolean }>(fns, 'gbpConnect');
            await gbpConnectFn({ code: event.data.code, orgId: payload.orgId });
            await refreshStatus();
            setConnecting(false);
            resolve();
          } catch (err) {
            fail(err);
          }
        };

        const closeWatcher = window.setInterval(() => {
          if (popup.closed) {
            fail(new Error('Okno autoryzacji zostało zamknięte przed zakończeniem'));
          }
        }, 500);

        window.addEventListener('message', handleMessage);
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'GBP connection failed');
      setConnecting(false);
      throw e;
    }
  }, [fns, refreshStatus]);

  const getLocations = useCallback(async (orgId?: string) => {
    const fn = httpsCallable<{ orgId?: string }, GBPGetLocationsResponse>(fns, 'gbpGetLocations');
    const result = await fn(orgId ? { orgId } : {});
    return result.data.locations;
  }, [fns]);

  const ensureLocation = useCallback(async (orgId: string) => {
    const fn = httpsCallable<GBPEnsureLocationRequest, GBPEnsureLocationResponse>(fns, 'gbpEnsureLocationForOrganization');
    const result = await fn({ orgId });
    return result.data;
  }, [fns]);

  return { status, loading, connecting, error, connect, getLocations, ensureLocation, refreshStatus };
}
