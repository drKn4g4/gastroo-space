'use client';

import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import SpacePageContainer from '../components/SpacePageContainer';
import { useTranslation } from '@/lib/i18n/client';
import { useEffect, useMemo, useState } from 'react';
import type { Restaurant } from '@/types/organization';
import { collectionGroup, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Timestamp } from 'firebase/firestore';

type TimeRange = { start?: string; end?: string };

type PublicEventDoc = {
  id?: string;
  name?: string;
  description?: string | null;
  status?: string;
  visibility?: string;
  organizationId?: string;
  restaurantId?: string;
  schedule?: {
    startAt?: unknown;
    endAt?: unknown;
    daysOfWeek?: number[];
    timeRanges?: TimeRange[];
  };
};

type PublicPromotionDoc = {
  id?: string;
  name?: string;
  description?: string | null;
  status?: string;
  organizationId?: string;
  restaurantId?: string;
  schedule?: {
    startAt?: unknown;
    endAt?: unknown;
    daysOfWeek?: number[];
    timeRanges?: TimeRange[];
  };
};

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const d = (value as { toDate: () => unknown }).toDate();
    return d instanceof Date ? d : null;
  }
  return null;
}

function formatGcalDate(d: Date) {
  // Google expects UTC: YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function gcalTemplateUrl(params: { title: string; details?: string; startAt: Date; endAt: Date }) {
  const sp = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${formatGcalDate(params.startAt)}/${formatGcalDate(params.endAt)}`,
  });
  if (params.details) sp.set('details', params.details);
  return `https://calendar.google.com/calendar/render?${sp.toString()}`;
}

export default function CalendarPage({ restaurants }: { restaurants: Restaurant[] }) {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang ?? 'pl';
  const { t } = useTranslation(lang, 'space');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; orgId: string | null; restaurantId: string | null; title: string; description?: string; startAt: Date; endAt: Date }>>([]);
  const [promotions, setPromotions] = useState<Array<{ id: string; orgId: string | null; restaurantId: string | null; title: string; description?: string; scheduleText: string }>>([]);

  const restaurantsByKey = useMemo(() => {
    const m = new Map<string, Restaurant>();
    for (const r of restaurants) {
      const orgId = (r as unknown as { organizationId?: string | null }).organizationId ?? null;
      if (!orgId) continue;
      m.set(`${orgId}:${r.id}`, r);
    }
    return m;
  }, [restaurants]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [eventsSnap, promotionsSnap] = await Promise.all([
          getDocs(query(collectionGroup(db, 'events'), where('visibility', '==', 'public'), limit(50))),
          getDocs(query(collectionGroup(db, 'promotions'), limit(50))),
        ]);

        if (cancelled) return;

        const loadedEvents = eventsSnap.docs
          .map((d) => {
            const raw = (d.data() as PublicEventDoc) ?? {};
            const orgId = d.ref.parent.parent?.id ?? null;
            const schedule = raw.schedule ?? {};
            const startAt = toDate(schedule.startAt);
            const endAt = toDate(schedule.endAt);
            const status = String(raw.status ?? '');
            if (!startAt || !endAt) return null;
            if (!['active', 'scheduled'].includes(status)) return null;
            return {
              id: d.id,
              orgId,
              restaurantId: (raw.restaurantId ?? null) as string | null,
              title: raw.name ? String(raw.name) : d.id,
              description: raw.description ? String(raw.description) : undefined,
              startAt,
              endAt,
            };
          })
          .filter((v): v is NonNullable<typeof v> => Boolean(v));

        loadedEvents.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        setEvents(loadedEvents);

        const loadedPromotions = promotionsSnap.docs
          .map((d) => {
            const raw = (d.data() as PublicPromotionDoc) ?? {};
            const orgId = d.ref.parent.parent?.id ?? null;
            const schedule = raw.schedule ?? {};
            const days = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
            const ranges = Array.isArray(schedule.timeRanges) ? schedule.timeRanges : [];
            const rangesText = ranges
              .map((r) => `${r.start ?? '??'}–${r.end ?? '??'}`)
              .join(', ');
            const scheduleText =
              days.length || ranges.length
                ? `${days.length ? `${t('calendar.recurring', { defaultValue: 'Cyklicznie' })}: ${days.join(', ')}` : t('calendar.recurring', { defaultValue: 'Cyklicznie' })}${rangesText ? ` · ${rangesText}` : ''}`
                : t('calendar.promo_schedule_unknown', { defaultValue: 'Godziny promocji: —' });
            return {
              id: d.id,
              orgId,
              restaurantId: (raw.restaurantId ?? null) as string | null,
              title: raw.name ? String(raw.name) : d.id,
              description: raw.description ? String(raw.description) : undefined,
              scheduleText,
            };
          })
          .filter((v) => Boolean(v.title));

        setPromotions(loadedPromotions);
      } catch (err) {
        console.error('Failed to load /space calendar feed:', err);
        if (!cancelled) setError(t('calendar.load_error', { defaultValue: 'Nie udalo sie pobrac kalendarza.' }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <SpacePageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
        {t('calendar.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('calendar.subtitle')}
      </Typography>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && events.length === 0 && promotions.length === 0 && (
        <Alert severity="info">{t('calendar.empty', { defaultValue: 'Brak nadchodzacych eventow lub promocji.' })}</Alert>
      )}

      {!loading && !error && (events.length > 0 || promotions.length > 0) && (
        <Stack spacing={2}>
          {events.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                {t('calendar.section_events', { defaultValue: 'Eventy' })}
              </Typography>
              {events.map((ev) => {
                const rest = ev.orgId && ev.restaurantId ? restaurantsByKey.get(`${ev.orgId}:${ev.restaurantId}`) : undefined;
                const details = [rest?.name ? `Lokal: ${rest.name}` : null, ev.description ?? null].filter(Boolean).join('\n');
                const url = gcalTemplateUrl({ title: ev.title, details: details || undefined, startAt: ev.startAt, endAt: ev.endAt });
                return (
                  <Box key={ev.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack spacing={0.75}>
                      <Typography sx={{ fontWeight: 800 }}>{ev.title}</Typography>
                      {rest?.name && (
                        <Typography variant="body2" color="text.secondary">
                          {rest.name}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {ev.startAt.toLocaleString(lang)} – {ev.endAt.toLocaleString(lang)}
                      </Typography>
                      {ev.description && (
                        <Typography variant="body2" color="text.secondary">
                          {ev.description}
                        </Typography>
                      )}
                      <Button size="small" variant="outlined" href={url} target="_blank" rel="noreferrer">
                        {t('calendar.add_to_gcal', { defaultValue: 'Dodaj do Google Calendar' })}
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}

          {events.length > 0 && promotions.length > 0 && <Divider />}

          {promotions.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                {t('calendar.section_promotions', { defaultValue: 'Promocje' })}
              </Typography>
              {promotions.map((p) => {
                const rest = p.orgId && p.restaurantId ? restaurantsByKey.get(`${p.orgId}:${p.restaurantId}`) : undefined;
                return (
                  <Box key={p.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack spacing={0.75}>
                      <Typography sx={{ fontWeight: 800 }}>{p.title}</Typography>
                      {rest?.name && (
                        <Typography variant="body2" color="text.secondary">
                          {rest.name}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {p.scheduleText}
                      </Typography>
                      {p.description && (
                        <Typography variant="body2" color="text.secondary">
                          {p.description}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Stack>
      )}
    </SpacePageContainer>
  );
}
