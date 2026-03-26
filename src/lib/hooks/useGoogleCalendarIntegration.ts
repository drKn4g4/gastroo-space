// src/lib/hooks/useGoogleCalendarIntegration.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';

const GCAL_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID ?? '';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export type GoogleCalendarStatus = {
  connected: boolean;
  calendarId?: string | null;
};

export type CalendarBookingInput = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  partySize?: number;
  guestName?: string;
  restaurantName?: string;
  notes?: string;
};

export type CalendarShiftInput = {
  id: string;
  startAt: string; // ISO
  endAt: string; // ISO
  staffName?: string;
  role?: string;
  restaurantName?: string;
  notes?: string;
};

export type CalendarEventInput = {
  id: string;
  name: string;
  startAt: string; // ISO
  endAt: string; // ISO
  description?: string;
  restaurantName?: string;
};

export function useGoogleCalendarIntegration() {
  const fns = getFunctions(app, 'europe-west1');
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const getStatus = httpsCallable<void, GoogleCalendarStatus>(fns, 'gcalGetStatus');
      const result = await getStatus();
      setStatus(result.data);
    } catch (e) {
      console.error('gcalGetStatus error', e);
    } finally {
      setLoading(false);
    }
  }, [fns]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const connect = useCallback(async (orgId?: string) => {
    setConnecting(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        client_id: GCAL_CLIENT_ID,
        redirect_uri: `${window.location.origin}/api/calendar/callback`,
        response_type: 'code',
        scope: GCAL_SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state: 'gcal_connect',
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      const popup = window.open(authUrl, 'gcal-auth', 'width=600,height=700');
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GCAL_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          setError(event.data?.error ?? 'Google Calendar connection failed');
          setConnecting(false);
          return;
        }
        if (event.data?.type !== 'GCAL_AUTH_SUCCESS') return;
        window.removeEventListener('message', handleMessage);
        popup?.close();
        const { code } = event.data;
        const gcalConnectFn = httpsCallable<{ code: string; orgId?: string }, GoogleCalendarStatus>(
          fns,
          'gcalConnect',
        );
        await gcalConnectFn({ code, orgId });
        await refreshStatus();
        setConnecting(false);
      };
      window.addEventListener('message', handleMessage);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google Calendar connection failed');
      setConnecting(false);
    }
  }, [fns, refreshStatus]);

  const syncBookings = useCallback(async (bookings: CalendarBookingInput[]) => {
    const fn = httpsCallable<{ bookings: CalendarBookingInput[] }, { synced: number }>(fns, 'gcalSyncBookings');
    const res = await fn({ bookings });
    return res.data;
  }, [fns]);

  const syncShifts = useCallback(async (shifts: CalendarShiftInput[]) => {
    const fn = httpsCallable<{ shifts: CalendarShiftInput[] }, { synced: number }>(fns, 'gcalSyncShifts');
    const res = await fn({ shifts });
    return res.data;
  }, [fns]);

  const syncEvents = useCallback(async (events: CalendarEventInput[]) => {
    const fn = httpsCallable<{ events: CalendarEventInput[] }, { synced: number }>(fns, 'gcalSyncEvents');
    const res = await fn({ events });
    return res.data;
  }, [fns]);

  return { status, loading, connecting, error, connect, refreshStatus, syncBookings, syncShifts, syncEvents };
}
