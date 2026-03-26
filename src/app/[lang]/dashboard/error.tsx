'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from '@/lib/i18n/client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang || 'pl';
  const { t } = useTranslation(lang, 'dashboard');

  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  const handleReset = () => {
    reset();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          textAlign: 'center',
        }}
      >
        <ErrorOutlineIcon
          sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
        />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          {t('dashboard.error.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('dashboard.error.message')}
        </Typography>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              textAlign: 'left',
              bgcolor: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </Paper>
        )}

        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
        >
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
          >
            {t('dashboard.error.retry')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
          >
            {t('dashboard.error.home')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
