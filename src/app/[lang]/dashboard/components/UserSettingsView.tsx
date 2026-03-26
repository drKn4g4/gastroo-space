'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/client';

function formatUserCode(uid: string): string {
  const prepared = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const normalized = prepared.length >= 14 ? prepared.slice(0, 14) : `${prepared}${'X'.repeat(14 - prepared.length)}`;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 9)}-${normalized.slice(9, 14)}`;
}

export default function UserSettingsView({
  uid,
  email,
  displayName,
  lang,
}: {
  uid: string;
  email: string | null;
  displayName: string | null;
  lang: string;
}) {
  const router = useRouter();
  const { t } = useTranslation(lang, 'dashboard');
  const { user: authUser, profile, refreshProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  const isGastronaut = profile?.isGastronaut ?? false;

  const userCode = useMemo(() => formatUserCode(uid), [uid]);

  const handleModeChange = async (nextValue: boolean) => {
    if (!authUser) return;
    setSavingMode(true);
    try {
      const token = await authUser.getIdToken();
      await fetch('/api/user/update-claims', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGastronaut: nextValue }),
      });
      await authUser.getIdToken(true);
      refreshProfile();
    } catch (error) {
      console.error('Failed to update gastronaut mode:', error);
    } finally {
      setSavingMode(false);
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await signOut(auth);
      router.push(`/${lang}/login`);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
        {t('dashboard.user_settings.title', { defaultValue: 'Ustawienia' })}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('dashboard.user_settings.subtitle', {
          defaultValue: 'Tylko najważniejsze rzeczy: konto, tryb użytkownika, język i wylogowanie.',
        })}
      </Typography>

      <Card sx={{ borderRadius: '1rem', mb: 2 }}>
        <CardContent>
          <Stack spacing={0.75}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('dashboard.user_settings.profile', { defaultValue: 'Konto' })}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {displayName || t('dashboard.user_settings.no_name', { defaultValue: 'Użytkownik gastroo' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {email || t('dashboard.user_settings.no_email', { defaultValue: 'Brak adresu e-mail' })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {userCode}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: '1rem', mb: 2 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={isGastronaut} onChange={(event) => { void handleModeChange(event.target.checked); }} disabled={savingMode} />}
              label={t('dashboard.user_settings.gastronaut_mode', { defaultValue: 'Tryb gastronauty' })}
            />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t('dashboard.user_settings.language', { defaultValue: 'Język interfejsu' })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.user_settings.language_hint', { defaultValue: 'Zmiana działa od razu dla całej aplikacji.' })}
                </Typography>
              </Box>
              <LanguageSwitcher />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Button variant="outlined" color="inherit" fullWidth onClick={() => { void handleLogout(); }} disabled={signingOut}>
        {signingOut
          ? t('dashboard.user_settings.logging_out', { defaultValue: 'Wylogowywanie...' })
          : t('dashboard.user_settings.logout', { defaultValue: 'Wyloguj' })}
      </Button>
    </Box>
  );
}
