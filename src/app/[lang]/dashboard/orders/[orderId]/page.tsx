'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Divider, Stack, Typography, Chip } from '@mui/material';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { useOrganization } from '../../../providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

type ActiveSessionDoc = {
  organizationId?: string;
  restaurantId?: string;
  tableName?: string;
  tableNumber?: number;
  guestIds?: unknown[];
  totals?: { billTotal?: number };
  currency?: string;
  status?: string;
  createdAt?: Date | Timestamp;
  closedAt?: Date | Timestamp;
  hostName?: string;
  items?: Array<{ name?: string; quantity?: number; price?: number; status?: string }>;
};

function toDate(value: Date | Timestamp | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

export default function OrderDetailsPage() {
  const { user, loading } = useAuth();
  const { organization, currentRestaurant } = useOrganization();
  const router = useRouter();
  const params = useParams<{ lang?: string; orderId?: string }>();
  const lang = params?.lang ?? 'pl';
  const orderId = params?.orderId ?? '';
  const { t } = useTranslation(lang, 'orders');

  const [fetching, setFetching] = useState(true);
  const [session, setSession] = useState<ActiveSessionDoc | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) return;
      setFetching(true);
      setNotFound(false);
      try {
        const snap = await getDoc(doc(db, 'activeSessions', orderId));
        if (cancelled) return;
        if (!snap.exists()) {
          setSession(null);
          setNotFound(true);
          return;
        }
        setSession(snap.data() as ActiveSessionDoc);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orderId]);

  const guard = useMemo(() => {
    if (!session) return { ok: true as const };
    if (organization?.id && session.organizationId && session.organizationId !== organization.id) {
      return { ok: false as const, reason: 'org' as const };
    }
    if (currentRestaurant?.id && session.restaurantId && session.restaurantId !== currentRestaurant.id) {
      return { ok: false as const, reason: 'restaurant' as const };
    }
    return { ok: true as const };
  }, [session, organization?.id, currentRestaurant?.id]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!orderId) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('orders.no_orders')}</Typography>
      </PageContainer>
    );
  }

  if (fetching) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !session) {
    return (
      <PageContainer>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t('orders.title')}
        </Typography>
        <Typography color="text.secondary">Not found: {orderId}</Typography>
      </PageContainer>
    );
  }

  if (!guard.ok) {
    return (
      <PageContainer>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t('orders.title')}
        </Typography>
        <Typography color="text.secondary">Forbidden</Typography>
      </PageContainer>
    );
  }

  const total = session.totals?.billTotal ?? 0;
  const currency = session.currency ?? 'PLN';
  const guestCount = Array.isArray(session.guestIds) ? session.guestIds.length : 0;
  const openedAt = toDate(session.createdAt);
  const closedAt = toDate(session.closedAt);

  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {t('orders.title')} · {orderId}
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {t('orders.table')} {session.tableNumber ?? '—'} {session.tableName ? `· ${session.tableName}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {guestCount} {t('orders.guests', { defaultValue: 'gości' })}
                {session.hostName ? ` · ${session.hostName}` : ''}
              </Typography>
              {openedAt ? (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Opened: {openedAt.toLocaleString()}
                </Typography>
              ) : null}
              {closedAt ? (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Closed: {closedAt.toLocaleString()}
                </Typography>
              ) : null}
            </Box>

            <Stack alignItems="flex-end" spacing={0.5}>
              {session.status ? <Chip label={session.status} size="small" variant="outlined" /> : null}
              <Typography sx={{ fontWeight: 900 }}>
                {total.toFixed(2)} {currency}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            {(session.items ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('orders.no_orders')}</Typography>
            ) : (
              (session.items ?? []).map((it, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {it.name ?? '—'} {typeof it.quantity === 'number' ? `×${it.quantity}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {((it.price ?? 0) * (it.quantity ?? 1)).toFixed(2)} {currency}
                  </Typography>
                </Stack>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
