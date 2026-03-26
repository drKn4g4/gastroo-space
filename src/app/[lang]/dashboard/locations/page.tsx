// src/app/[lang]/dashboard/locations/page.tsx
'use client';

import { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import GbpConnector from '../../components/GbpConnector';
import GbpManagementPanel from '../../components/GbpManagementPanel'; // Stworzymy ten komponent za chwilę
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function LocationsPage() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');
  const { user, loading } = useAuth();
  
  // Ten stan będzie symulował, czy użytkownik połączył swoje konto z GBP
  const [isGbpConnected, setIsGbpConnected] = useState(false);

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
        {t('dashboard.locations.title')}
      </Typography>

      {isGbpConnected ? (
        // Jeśli "połączono", pokaż pełny panel zarządzania
        <GbpManagementPanel />
      ) : (
        // Jeśli nie, pokaż komponent do łączenia
        <GbpConnector onConnect={() => setIsGbpConnected(true)} />
      )}
    </PageContainer>
  );
} 
