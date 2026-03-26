'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Button, Card, CardContent, FormControlLabel, Stack, Switch, Typography,
  Divider, Chip, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar
} from '@mui/material';
import {
  CreditCard, Receipt, History, ChevronRight,
  Work, Language, Logout, Person
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/client';
import SpacePageContainer from './SpacePageContainer';
import { UI } from '@/styles/theme';

export default function SpaceSettingsView() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const { user, profile, setViewMode, refreshProfile } = useAuth();
  const { t } = useTranslation(lang, 'settings');

  const [signingOut, setSigningOut] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  const isGastronaut = profile?.isGastronaut ?? false;
  // Prefer organizations (Firestore), fallback to organization (claims)
  const organizations = (profile?.organization ?? []);
  const hasOrganizations = Array.isArray(organizations) && organizations.length > 0;
  const userCode = profile?.userCode ?? '';

  const handleGastronautToggle = async (checked: boolean) => {
    if (!user) return;
    setSavingMode(true);
    try {
      const token = await user.getIdToken();
      await fetch('/api/user/update-claims', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGastronaut: checked }),
      });
      await user.getIdToken(true);
      refreshProfile();

      const newMode = checked ? 'gastronaut' : 'foodie';
      await setViewMode(newMode);
      if (checked && hasOrganizations) router.push(`/${lang}/pinpad`);
    } catch (error) {
      console.error('Failed to update mode:', error);
    } finally {
      setSavingMode(false);
    }
  };

  const handleLogout = async () => {
    try { setSigningOut(true); await signOut(auth); router.push(`/${lang}/login`); }
    finally { setSigningOut(false); }
  };

  return (
    <SpacePageContainer sx={{ gap: 2.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, mt: 2 }}>
        {t('settings.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('settings.subtitle')}
      </Typography>

      {/* SEKCJA 1: DANE OSOBOWE */}
      <Typography variant="overline" sx={{ fontWeight: 900, ml: 1, color: 'text.secondary' }}>
        {t('settings.section_your_data')}
      </Typography>
      <Card variant="outlined" sx={{ borderRadius: UI.radius.xl, mt: 1 }}>
        <List disablePadding>
          <ListItem sx={{ py: 2 }}>
            <ListItemIcon>
              <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 800 }}>
                {user?.displayName?.charAt(0) || 'U'}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={user?.displayName || t('settings.user_fallback')}
              secondary={user?.email || t('settings.no_email')}
              primaryTypographyProps={{ fontWeight: 800, variant: 'body1' }}
            />
            <Chip label={userCode} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, opacity: 0.8 }} />
          </ListItem>
          <Divider />
          <ListItemButton onClick={() => router.push(`/${lang}/settings/profile-edit`)}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('settings.edit_profile')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
            <ChevronRight fontSize="small" color="disabled" />
          </ListItemButton>
        </List>
      </Card>

      {/* SEKCJA 2: MÓJ PORTFEL (Stripe / Faktury) */}
      <Typography variant="overline" sx={{ fontWeight: 900, ml: 1, color: 'text.secondary' }}>
        {t('settings.section_payments')}
      </Typography>
      <Card variant="outlined" sx={{ borderRadius: UI.radius.xl, mt: 1, overflow: 'hidden' }}>
        <List disablePadding>
          <ListItemButton onClick={() => router.push(`/${lang}/settings/payments`)}>
            <ListItemIcon><CreditCard color="primary" /></ListItemIcon>
            <ListItemText
              primary={t('settings.payment_methods')}
              secondary={t('settings.payment_methods_desc')}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
            <ChevronRight color="disabled" />
          </ListItemButton>
          <Divider />
          <ListItemButton onClick={() => router.push(`/${lang}/settings/invoices`)}>
            <ListItemIcon><Receipt color="primary" /></ListItemIcon>
            <ListItemText
              primary={t('settings.invoicing')}
              secondary={t('settings.invoicing_desc')}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
            <ChevronRight color="disabled" />
          </ListItemButton>
          <Divider />
          <ListItemButton onClick={() => router.push(`/${lang}/settings/history`)}>
            <ListItemIcon><History color="primary" /></ListItemIcon>
            <ListItemText
              primary={t('settings.transaction_history')}
              secondary={t('settings.transaction_history_desc')}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
            <ChevronRight color="disabled" />
          </ListItemButton>
        </List>
      </Card>

      {/* SEKCJA 3: PROFIL GASTRONAUTY (Tryb pracy) */}
      <Typography variant="overline" sx={{ fontWeight: 900, ml: 1, color: 'text.secondary' }}>
        {t('settings.section_gastro_work')}
      </Typography>
      <Card variant="outlined" sx={{ borderRadius: UI.radius.xl, mt: 1 }}>
        <CardContent>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={isGastronaut}
                  onChange={(e) => void handleGastronautToggle(e.target.checked)}
                  disabled={savingMode}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {t('settings.gastronaut_mode')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('settings.gastronaut_mode_desc')}
                  </Typography>
                </Box>
              }
            />

            {isGastronaut && hasOrganizations && (
              <Button
                variant="contained"
                startIcon={<Work />}
                fullWidth
                onClick={() => { void setViewMode('gastronaut'); router.push(`/${lang}/pinpad`); }}
                sx={{ borderRadius: UI.radius.lg, py: 1.5, fontWeight: 800, boxShadow: 'none' }}
              >
                {t('settings.open_pinpad')}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* SEKCJA 4: SYSTEMOWE */}
      <Card variant="outlined" sx={{ borderRadius: UI.radius.xl, bgcolor: 'transparent', boxShadow: 'none' }}>
        <List disablePadding>
          <ListItem secondaryAction={<LanguageSwitcher />}>
            <ListItemIcon><Language /></ListItemIcon>
            <ListItemText
              primary={t('settings.app_language')}
              primaryTypographyProps={{ fontWeight: 700, variant: 'body2' }}
            />
          </ListItem>
        </List>
      </Card>

      <Button
        variant="text"
        color="error"
        fullWidth
        startIcon={<Logout />}
        onClick={() => void handleLogout()}
        disabled={signingOut}
        sx={{ mt: 2, fontWeight: 700, borderRadius: UI.radius.lg }}
      >
        {signingOut ? '...' : t('settings.sign_out')}
      </Button>
    </SpacePageContainer>
  );
}
