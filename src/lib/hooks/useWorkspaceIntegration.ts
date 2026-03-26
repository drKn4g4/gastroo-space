// src/lib/hooks/useWorkspaceIntegration.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';

// NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID może być dedykowanym klientem lub tym samym co Drive
const WORKSPACE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WORKSPACE_CLIENT_ID ??
  process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ??
  '';

const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/tasks',
].join(' ');

export type WorkspaceStatus = {
  connected: boolean;
  tasksListId?: string | null;
  connected_at?: { seconds: number };
};

export type WorkspaceSheetInfo = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
};

export type WorkspaceDocInfo = {
  documentId: string;
  documentUrl: string;
  title: string;
};

export type WorkspaceTodo = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  completed: boolean;
};

export function useWorkspaceIntegration() {
  const fns = getFunctions(app, 'europe-west1');
  const [status, setStatus] = useState<WorkspaceStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const getStatus = httpsCallable<void, WorkspaceStatus>(fns, 'workspaceGetStatus');
      const result = await getStatus();
      setStatus(result.data);
    } catch (e) {
      console.error('workspaceGetStatus error', e);
    } finally {
      setLoading(false);
    }
  }, [fns]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        client_id: WORKSPACE_CLIENT_ID,
        redirect_uri: `${window.location.origin}/api/workspace/callback`,
        response_type: 'code',
        scope: WORKSPACE_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state: 'workspace_connect',
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      const popup = window.open(authUrl, 'workspace-auth', 'width=600,height=700');

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'WORKSPACE_AUTH_SUCCESS') return;
        window.removeEventListener('message', handleMessage);
        popup?.close();
        const { code } = event.data;
        const connectFn = httpsCallable(fns, 'workspaceConnect');
        await connectFn({ code });
        await refreshStatus();
        setConnecting(false);
      };
      window.addEventListener('message', handleMessage);

      // Timeout na wypadek zamknięcia popupu bez autoryzacji
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setConnecting(false);
        }
      }, 500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google Workspace connection failed');
      setConnecting(false);
    }
  }, [fns, refreshStatus]);

  const disconnect = useCallback(async () => {
    try {
      const fn = httpsCallable(fns, 'workspaceDisconnect');
      await fn({});
      await refreshStatus();
    } catch (e) {
      console.error('workspaceDisconnect error', e);
    }
  }, [fns, refreshStatus]);

  const createSheet = useCallback(async (orgId: string, title: string): Promise<WorkspaceSheetInfo> => {
    const fn = httpsCallable<{ orgId: string; title: string }, WorkspaceSheetInfo>(fns, 'workspaceCreateSheet');
    const result = await fn({ orgId, title });
    return result.data;
  }, [fns]);

  const syncToSheet = useCallback(async (orgId: string, spreadsheetId: string, rows: Record<string, unknown>[], sheetTitle?: string) => {
    const fn = httpsCallable(fns, 'workspaceSyncToSheet');
    await fn({ orgId, spreadsheetId, rows, sheetTitle });
  }, [fns]);

  const getTodos = useCallback(async (): Promise<WorkspaceTodo[]> => {
    const fn = httpsCallable<void, { tasks: WorkspaceTodo[] }>(fns, 'workspaceGetTodos');
    const result = await fn();
    return result.data.tasks;
  }, [fns]);

  const syncTodos = useCallback(async (todos: { id: string; title: string; notes?: string; due?: string; completed?: boolean }[]) => {
    const fn = httpsCallable(fns, 'workspaceSyncTodos');
    await fn({ todos });
  }, [fns]);

  const createDoc = useCallback(async (orgId: string, title: string, content?: string): Promise<WorkspaceDocInfo> => {
    const fn = httpsCallable<{ orgId: string; title: string; content?: string }, WorkspaceDocInfo>(fns, 'workspaceCreateDoc');
    const result = await fn({ orgId, title, content });
    return result.data;
  }, [fns]);

  return {
    status,
    loading,
    connecting,
    error,
    connect,
    disconnect,
    refreshStatus,
    createSheet,
    syncToSheet,
    getTodos,
    syncTodos,
    createDoc,
  };
}
