// src/app/[lang]/dashboard/bookings/page.tsx
'use client';

import { useAuth } from '../../providers/AuthProvider';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import BookingCalendarView from '../../components/BookingCalendarView';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function BookingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang || 'pl';
  const sp = useSearchParams();
  const bookingId = sp?.get('bookingId') ?? undefined;
  const { t } = useTranslation(lang, 'dashboard');

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${lang}/login`);
    }
  }, [user, loading, router, lang]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.nav.bookings')}
      </Typography>
      <BookingCalendarView focusBookingId={bookingId} />
    </PageContainer>
  );
}
