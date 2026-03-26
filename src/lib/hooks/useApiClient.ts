'use client';

import { useCallback } from 'react';
import { getAuth } from 'firebase/auth';

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  data?: unknown;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * React hook that provides an authenticated API client.
 * Automatically attaches the current Firebase user's ID token as `Authorization: Bearer TOKEN`.
 *
 * Usage:
 *   const { apiCall } = useApiClient();
 *   const { ok, data, error } = await apiCall('/api/bookings/create', { data: { ... } });
 */
export function useApiClient() {
  const apiCall = useCallback(async <T = unknown>(
    path: string,
    { data, method = data ? 'POST' : 'GET', headers = {}, ...rest }: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> => {
    const auth = getAuth();
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);

    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...headers,
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...rest,
    });

    let responseData: T | null = null;
    let errorMsg: string | null = null;

    try {
      const json = await res.json();
      if (res.ok) {
        responseData = (json.data ?? json) as T;
      } else {
        errorMsg = (typeof json.error === 'string' ? json.error : json.error?.message) ?? `HTTP ${res.status}`;
      }
    } catch {
      errorMsg = res.ok ? null : `HTTP ${res.status}`;
    }

    return { ok: res.ok, status: res.status, data: responseData, error: errorMsg };
  }, []);

  return { apiCall };
}
