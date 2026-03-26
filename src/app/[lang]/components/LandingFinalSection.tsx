'use client';

import { Box, Button, Container, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import Footer from './Footer';

export default function LandingFinalSection() {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang, 'landing');

  return (
    <Box
      component="section"
      sx={{
        minHeight: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        py: 3,
      }}
    >
      <Container maxWidth="md" sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <Stack spacing={2} sx={{ textAlign: 'center' }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
            Start
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: '-0.03em' }}>
            Zacznij od lokalu testowego
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: '32rem', mx: 'auto' }}>
            {t('landing.final.description')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button variant="contained" component={Link} href={`/${params.lang}/onboarding`}>
              Dodaj lokal testowy
            </Button>
            <Button variant="outlined" component={Link} href={`/${params.lang}/login`}>
              {t('landing.final.have_account')}
            </Button>
          </Stack>
        </Stack>
      </Container>
      <Footer />
    </Box>
  );
}
