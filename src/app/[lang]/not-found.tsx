'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import NoMealsIcon from '@mui/icons-material/NoMeals';
import HomeIcon from '@mui/icons-material/Home';
import { UI } from '@/styles/theme';
import { useTranslation } from '@/lib/i18n/client';

// Render only on client to avoid hydration mismatch
const NotFoundContent = dynamic(
  () => Promise.resolve(NotFoundPage),
  { ssr: false, loading: () => <CircularProgress /> }
);

function NotFoundPage() {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang || 'pl';
  const { t } = useTranslation(lang, 'errors');

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        px: UI.space.lg,
        py: UI.space.xl,
        textAlign: 'center',
      }}
    >
      {/* Creative 404 with NoMeals icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: UI.space.xl,
          fontSize: 'clamp(4rem, 15vw, 8rem)',
        }}
      >
        <NoMealsIcon sx={{ fontSize: 'inherit', opacity: 0.7 }} />
      </Box>

      {/* Error message */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: UI.space.md,
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
        }}
      >
        {t('errors.notFound.title')}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
          mb: UI.space.lg,
          maxWidth: '32rem',
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          lineHeight: 1.6,
        }}
      >
        {t('errors.notFound.message')}
      </Typography>

      {/* Action buttons */}
      <Stack direction="row" spacing={UI.space.md} sx={{ mt: UI.space.xl }}>
        <Button
          component={Link}
          href={`/${lang}`}
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          sx={{
            borderRadius: UI.radius.md,
            px: UI.space.lg,
            py: UI.space.md,
            fontWeight: 600,
          }}
        >
          {t('errors.buttons.home')}
        </Button>
      </Stack>

      {/* Footer note */}
      <Typography
        variant="caption"
        sx={{
          mt: UI.space.xl,
          opacity: 0.5,
          fontSize: '0.8rem',
        }}
      >
        {t('errors.notFound.footer')} • gastroo.space
      </Typography>
    </Box>
  );
}

export default function NotFound() {
  return <NotFoundContent />;
}

