// src/app/[lang]/dashboard/integrations/GoogleCalendarIntegration.tsx
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Card, CardContent, CardActions, Typography, Button, Chip, Stack,
  Alert, CircularProgress, Avatar, Box, Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import { useGoogleCalendarIntegration } from '@/lib/hooks/useGoogleCalendarIntegration';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

export default function GoogleCalendarIntegration() {
  const theme = useTheme();
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');
  const { organization, currentRestaurant } = useOrganization();
  const { status, loading, connecting, connect, error, syncBookings, syncShifts, syncEvents } = useGoogleCalendarIntegration();

  const [syncing, setSyncing] = useState<'bookings' | 'shifts' | 'events' | null>(null);
  const [lastResult, setLastResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const restaurantName = currentRestaurant?.name ?? null;

  const handleConnect = useCallback(async () => {
    if (!organization?.id) return;
    await connect(organization.id);
  }, [connect, organization?.id]);

  const handleSyncBookings = useCallback(async () => {
    if (!organization?.id || !currentRestaurant?.id) return;
    setLastResult(null);
    setSyncing('bookings');
    try {
      const snap = await getDocs(
        query(
          collection(db, 'bookings'),
          where('organizationId', '==', organization.id),
          where('restaurantId', '==', currentRestaurant.id),
          where('bookingDate', '>=', today),
          orderBy('bookingDate', 'asc'),
          limit(200),
        ),
      );
      const inputs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
        .map((raw) => ({
          id: String(raw.id),
          date: String(raw.bookingDate ?? raw.date ?? ''),
          startTime: String(raw.bookingTime ?? raw.time ?? ''),
          endTime: raw.bookingTimeEnd ? String(raw.bookingTimeEnd) : undefined,
          partySize: typeof raw.guestCount === 'number' ? raw.guestCount : undefined,
          guestName: raw.name ? String(raw.name) : raw.guestName ? String(raw.guestName) : undefined,
          restaurantName: restaurantName ?? undefined,
          notes: raw.notes ? String(raw.notes) : undefined,
        }))
        .filter((b) => Boolean(b.date) && Boolean(b.startTime));

      if (!inputs.length) {
        setLastResult({ kind: 'success', message: t('dashboard.integrations.gcal_sync_empty', { defaultValue: 'Brak danych do synchronizacji.' }) });
        return;
      }

      const res = await syncBookings(inputs);
      setLastResult({
        kind: 'success',
        message: t('dashboard.integrations.gcal_sync_done', { count: res.synced, defaultValue: 'Zsynchronizowano: {{count}}' }),
      });
    } catch (e: unknown) {
      setLastResult({
        kind: 'error',
        message: e instanceof Error ? e.message : t('dashboard.integrations.gcal_sync_error', { defaultValue: 'Nie udalo sie zsynchronizowac.' }),
      });
    } finally {
      setSyncing(null);
    }
  }, [organization?.id, currentRestaurant?.id, today, restaurantName, syncBookings, t]);

  const handleSyncShifts = useCallback(async () => {
    if (!organization?.id || !currentRestaurant?.id) return;
    setLastResult(null);
    setSyncing('shifts');
    try {
      const snap = await getDocs(
        query(
          collection(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}/shifts`),
          where('date', '>=', today),
          orderBy('date', 'asc'),
          limit(200),
        ),
      );

      const inputs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
        .map((raw) => {
          const startTs = raw.scheduledStart instanceof Timestamp ? raw.scheduledStart : null;
          const endTs = raw.scheduledEnd instanceof Timestamp ? raw.scheduledEnd : null;
          return {
            id: String(raw.id),
            startAt: startTs ? startTs.toDate().toISOString() : '',
            endAt: endTs ? endTs.toDate().toISOString() : '',
            staffName: raw.staffName ? String(raw.staffName) : undefined,
            role: raw.role ? String(raw.role) : undefined,
            restaurantName: restaurantName ?? undefined,
          };
        })
        .filter((s) => Boolean(s.startAt) && Boolean(s.endAt));

      if (!inputs.length) {
        setLastResult({ kind: 'success', message: t('dashboard.integrations.gcal_sync_empty', { defaultValue: 'Brak danych do synchronizacji.' }) });
        return;
      }

      const res = await syncShifts(inputs);
      setLastResult({
        kind: 'success',
        message: t('dashboard.integrations.gcal_sync_done', { count: res.synced, defaultValue: 'Zsynchronizowano: {{count}}' }),
      });
    } catch (e: unknown) {
      setLastResult({
        kind: 'error',
        message: e instanceof Error ? e.message : t('dashboard.integrations.gcal_sync_error', { defaultValue: 'Nie udalo sie zsynchronizowac.' }),
      });
    } finally {
      setSyncing(null);
    }
  }, [organization?.id, currentRestaurant?.id, today, restaurantName, syncShifts, t]);

  const handleSyncEvents = useCallback(async () => {
    if (!organization?.id || !currentRestaurant?.id) return;
    setLastResult(null);
    setSyncing('events');
    try {
      const snap = await getDocs(
        query(
          collection(db, `organizations/${organization.id}/events`),
          where('restaurantId', '==', currentRestaurant.id),
          limit(200),
        ),
      );

      const inputs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
        .filter((raw) => ['active', 'scheduled'].includes(String(raw.status ?? '')))
        .map((raw) => {
          const schedule = (raw.schedule ?? {}) as Record<string, unknown>;
          const startTs = schedule.startAt instanceof Timestamp ? schedule.startAt : null;
          const endTs = schedule.endAt instanceof Timestamp ? schedule.endAt : null;
          return {
            id: String(raw.id),
            name: raw.name ? String(raw.name) : '',
            startAt: startTs ? startTs.toDate().toISOString() : '',
            endAt: endTs ? endTs.toDate().toISOString() : '',
            description: raw.description ? String(raw.description) : undefined,
            restaurantName: restaurantName ?? undefined,
          };
        })
        .filter((ev) => Boolean(ev.name) && Boolean(ev.startAt) && Boolean(ev.endAt));

      if (!inputs.length) {
        setLastResult({ kind: 'success', message: t('dashboard.integrations.gcal_sync_empty', { defaultValue: 'Brak danych do synchronizacji.' }) });
        return;
      }

      const res = await syncEvents(inputs);
      setLastResult({
        kind: 'success',
        message: t('dashboard.integrations.gcal_sync_done', { count: res.synced, defaultValue: 'Zsynchronizowano: {{count}}' }),
      });
    } catch (e: unknown) {
      setLastResult({
        kind: 'error',
        message: e instanceof Error ? e.message : t('dashboard.integrations.gcal_sync_error', { defaultValue: 'Nie udalo sie zsynchronizowac.' }),
      });
    } finally {
      setSyncing(null);
    }
  }, [organization?.id, currentRestaurant?.id, restaurantName, syncEvents, t]);

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: status.connected ? 'primary.main' : 'divider',
        ...(status.connected && {
          background: alpha(theme.palette.primary.main, 0.04),
        }),
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar sx={{ bgcolor: '#4285F4', width: 48, height: 48 }}>
            <CalendarMonthIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>Google Calendar</Typography>
              {status.connected ? (
                <Chip icon={<CheckCircleIcon />} label={t('dashboard.integrations.connected')} color="primary" size="small" sx={{ fontWeight: 600 }} />
              ) : (
                <Chip label={t('dashboard.integrations.not_connected')} size="small" variant="outlined" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.integrations.gcal_desc')}
            </Typography>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {lastResult && (
              <Alert severity={lastResult.kind} sx={{ mt: 2 }}>
                {lastResult.message}
              </Alert>
            )}
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            color="primary"
            disabled={status.connected || connecting}
            onClick={handleConnect}
          >
            {connecting ? <CircularProgress size={20} /> : t('dashboard.integrations.gcal_connect_btn')}
          </Button>
          <Button variant="outlined" color="primary" disabled={!status.connected || syncing !== null} onClick={handleSyncBookings} startIcon={<SyncIcon />}>
            {syncing === 'bookings' ? t('dashboard.integrations.gcal_syncing') : t('dashboard.integrations.gcal_sync_bookings')}
          </Button>
          <Button variant="outlined" color="primary" disabled={!status.connected || syncing !== null} onClick={handleSyncShifts} startIcon={<SyncIcon />}>
            {syncing === 'shifts' ? t('dashboard.integrations.gcal_syncing') : t('dashboard.integrations.gcal_sync_shifts', { defaultValue: 'Synchronizuj zmiany' })}
          </Button>
          <Button variant="outlined" color="primary" disabled={!status.connected || syncing !== null} onClick={handleSyncEvents} startIcon={<SyncIcon />}>
            {syncing === 'events' ? t('dashboard.integrations.gcal_syncing') : t('dashboard.integrations.gcal_sync_events', { defaultValue: 'Synchronizuj eventy' })}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
