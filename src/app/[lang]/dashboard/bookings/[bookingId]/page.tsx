'use client';

import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import BookingCalendarView from '../../../components/BookingCalendarView';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function BookingDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ lang?: string; bookingId?: string }>();
  const lang = params?.lang ?? 'pl';
  const bookingId = params?.bookingId ?? '';
  const { t } = useTranslation(lang, 'dashboard');

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!bookingId) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.search.no_results')}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
        {t('dashboard.search.type.booking', { defaultValue: 'Rezerwacja' })} · {bookingId}
      </Typography>
      <BookingCalendarView focusBookingId={bookingId} />
    </PageContainer>
  );
}
