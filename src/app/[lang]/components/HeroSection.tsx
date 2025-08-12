// src/app/components/HeroSection.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Link from 'next/link';

export default function HeroSection() {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang); // <-- Użycie hooka

  return (
    <Box
      sx={{ bgcolor: 'background.paper', pt: 8, pb: 6 }}
    >
      <Container maxWidth="sm">
        <Typography component="h1" variant="h2" align="center" color="text.primary" gutterBottom>
          {t('hero.title')} {/* <-- Użycie tłumaczenia */}
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          {t('hero.subtitle')} {/* <-- Użycie tłumaczenia */}
        </Typography>
        <Stack sx={{ pt: 4 }} direction="row" spacing={2} justifyContent="center">
          <Button component={Link} href="/#demo" variant="contained">
            {t('hero.cta_demo')} {/* <-- Użycie tłumaczenia */}
          </Button>
          <Button component={Link} href="/#oferta" variant="outlined">
            {t('hero.cta_offer')} {/* <-- Użycie tłumaczenia */}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}