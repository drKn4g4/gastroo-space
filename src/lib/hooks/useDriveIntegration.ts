// src/lib/hooks/useDriveIntegration.ts
// Hook for interacting with Google Drive integration from the frontend
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';
import type {
  DriveDeleteFileRequest,
  DriveConnectRequest,
  DriveFileDescriptor,
  DriveGetFileRequest,
  DriveGetFileResponse,
  DriveListFilesRequest,
  DriveListFilesResponse,
  DriveProvisionRequest,
  DriveProvisionResponse,
  DriveUploadReportCsvRequest,
  DriveUploadReportCsvResponse,
  DriveStatusResponse,
  DriveUploadMenuImageRequest,
  DriveUploadMenuImageResponse,
} from '@/types/organization';

const DRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ?? '';
// Scope: only files the user explicitly picks via Google Picker
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export type DriveFile = DriveFileDescriptor;
export type DriveStatus = DriveStatusResponse;

interface DriveConnectOptions {
  rootFolderId?: string;
  orgId?: string;
}

export function useDriveIntegration() {
  const fns = getFunctions(app, 'europe-west1');
  const [status, setStatus] = useState<DriveStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load status on mount
  const refreshStatus = useCallback(async () => {
    try {
      const getStatus = httpsCallable<void, DriveStatusResponse>(fns, 'driveGetStatus');
      const result = await getStatus();
      setStatus(result.data);
    } catch (e) {
      console.error('driveGetStatus error', e);
    } finally {
      setLoading(false);
    }
  }, [fns]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // Start OAuth flow via popup window
  const connect = useCallback(async (options: DriveConnectOptions = {}) => {
    setConnecting(true);
    setError(null);
    try {
      const state = JSON.stringify({
        rootFolderId: options.rootFolderId ?? '',
        orgId: options.orgId ?? '',
      });

      const params = new URLSearchParams({
        client_id: DRIVE_CLIENT_ID,
        redirect_uri: `${window.location.origin}/api/drive/callback`,
        response_type: 'code',
        scope: DRIVE_SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      const popup = window.open(authUrl, 'google-drive-auth', 'width=600,height=700');

      if (!popup) {
        throw new Error('Nie udało się otworzyć okna autoryzacji Google Drive');
      }

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          window.removeEventListener('message', handleMessage);
          window.clearInterval(closeWatcher);
          popup.close();
        };

        const fail = (reason: unknown) => {
          cleanup();
          const message = reason instanceof Error ? reason.message : 'Connection failed';
          setError(message);
          setConnecting(false);
          reject(reason instanceof Error ? reason : new Error(message));
        };

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'DRIVE_AUTH_ERROR') {
            fail(new Error(event.data?.error ?? 'Autoryzacja Google Drive nie powiodła się'));
            return;
          }

          if (event.data?.type !== 'DRIVE_AUTH_SUCCESS') return;

          try {
            cleanup();
            const payload = typeof event.data?.state === 'string' ? JSON.parse(event.data.state) as DriveConnectOptions : {};
            const driveConnectFn = httpsCallable<DriveConnectRequest, { success: boolean }>(fns, 'driveConnect');
            await driveConnectFn({
              code: event.data.code,
              orgId: payload.orgId,
              rootFolderId: payload.rootFolderId,
            });
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
      setError(e instanceof Error ? e.message : 'Connection failed');
      setConnecting(false);
      throw e;
    }
  }, [fns, refreshStatus]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      const driveDisconnect = httpsCallable(fns, 'driveDisconnect');
      await driveDisconnect();
      setStatus({ connected: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  }, [fns]);

  const listFiles = useCallback(async (folderId: string, orgId?: string): Promise<DriveFile[]> => {
    const fn = httpsCallable<DriveListFilesRequest, DriveListFilesResponse>(fns, 'driveListFiles');
    const result = await fn({ folderId, orgId });
    return result.data.files;
  }, [fns]);

  const getFile = useCallback(async (fileId: string): Promise<unknown> => {
    const fn = httpsCallable<DriveGetFileRequest, DriveGetFileResponse>(fns, 'driveGetFile');
    const result = await fn({ fileId });
    return result.data.content;
  }, [fns]);

  const provision = useCallback(async (folderName: string, orgId?: string) => {
    const fn = httpsCallable<DriveProvisionRequest, DriveProvisionResponse>(fns, 'driveProvision');
    const result = await fn({ folderName, orgId });
    return result.data;
  }, [fns]);

  const uploadMenuImage = useCallback(async (payload: DriveUploadMenuImageRequest) => {
    const fn = httpsCallable<DriveUploadMenuImageRequest, DriveUploadMenuImageResponse>(fns, 'driveUploadMenuImage');
    const result = await fn(payload);
    return result.data;
  }, [fns]);

  const deleteFile = useCallback(async (payload: DriveDeleteFileRequest) => {
    const fn = httpsCallable<DriveDeleteFileRequest, { success: boolean }>(fns, 'driveDeleteFile');
    const result = await fn(payload);
    return result.data;
  }, [fns]);

  const uploadReportCsv = useCallback(async (payload: DriveUploadReportCsvRequest) => {
    const fn = httpsCallable<DriveUploadReportCsvRequest, DriveUploadReportCsvResponse>(fns, 'driveUploadReportCsv');
    const result = await fn(payload);
    return result.data;
  }, [fns]);

  return {
    status,
    loading,
    connecting,
    error,
    connect,
    disconnect,
    listFiles,
    getFile,
    provision,
    uploadMenuImage,
    deleteFile,
    uploadReportCsv,
  };
}
