'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Divider, Stack, Typography, Chip, Button } from '@mui/material';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { useOrganization } from '../../../providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

type BookingDoc = {
  name?: string;
  title?: string;
  guestName?: string;
  bookingDate?: string;
  bookingTime?: string;
  bookingTimeEnd?: string;
  guestPhone?: string;
  phone?: string;
  guestEmail?: string;
  guestCount?: number;
  status?: string;
};

function guessGuestKind(guestId: string): 'email' | 'phone' | 'name' {
  if (guestId.includes('@')) return 'email';
  const digits = guestId.replace(/[^\d]/g, '');
  if (digits.length >= 7) return 'phone';
  return 'name';
}

export default function GuestDetailsPage() {
  const { user, loading } = useAuth();
  const { organization, currentRestaurant } = useOrganization();
  const router = useRouter();
  const params = useParams<{ lang?: string; guestId?: string }>();
  const lang = params?.lang ?? 'pl';
  const guestId = params?.guestId ? decodeURIComponent(params.guestId) : '';
  const { t } = useTranslation(lang, 'dashboard');

  const [fetching, setFetching] = useState(true);
  const [bookings, setBookings] = useState<Array<{ id: string; data: BookingDoc }>>([]);

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organization?.id || !currentRestaurant?.id || !guestId) { setFetching(false); return; }
      setFetching(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('organizationId', '==', organization.id),
            where('restaurantId', '==', currentRestaurant.id),
            limit(250),
          ),
        );
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as BookingDoc }));
        const kind = guessGuestKind(guestId);
        const filtered = docs.filter(({ data }) => {
          const phone = (data.guestPhone || data.phone || '').toString();
          const email = (data.guestEmail || '').toString();
          const name = (data.guestName || data.name || '').toString();
          if (kind === 'email') return email.toLowerCase() === guestId.toLowerCase();
          if (kind === 'phone') return phone.replace(/[^\d]/g, '').includes(guestId.replace(/[^\d]/g, ''));
          return name.toLowerCase().includes(guestId.toLowerCase());
        });
        setBookings(filtered);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [organization?.id, currentRestaurant?.id, guestId]);

  const header = useMemo(() => {
    if (!guestId) return '—';
    return guestId;
  }, [guestId]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetching) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {t('dashboard.search.type.guest', { defaultValue: 'Gość' })} · {header}
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary">
              {t('dashboard.search.details.bookings', { defaultValue: 'Rezerwacje' })}: {bookings.length}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => router.push(`/${lang}/dashboard/bookings`)}>
              {t('dashboard.search.details.open', { defaultValue: 'Otwórz' })}
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {bookings.length === 0 ? (
            <Typography color="text.secondary">{t('dashboard.search.no_results')}</Typography>
          ) : (
            <Stack spacing={1}>
              {bookings.map(({ id, data }) => (
                <Card
                  key={id}
                  variant="outlined"
                  onClick={() => router.push(`/${lang}/dashboard/bookings/${id}`)}
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.light' } }}
                >
                  <CardContent sx={{ py: 1.25 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800 }} noWrap>
                          {data.title || data.name || data.guestName || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {data.bookingDate} {data.bookingTime}{data.bookingTimeEnd ? `–${data.bookingTimeEnd}` : ''}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        {data.status ? <Chip label={data.status} size="small" variant="outlined" /> : null}
                        {typeof data.guestCount === 'number' ? (
                          <Typography variant="caption" color="text.secondary">
                            {data.guestCount} {t('dashboard.search.guests')}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
