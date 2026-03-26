'use client';

import { useTranslation } from '@/lib/i18n/client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, TextField,
  Stack, Divider, CircularProgress, Alert, Select,
  MenuItem, FormControl, InputLabel, ListItemIcon, ListItemText,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import { useAuth } from '@/app/[lang]/providers/AuthProvider';
import { UI } from '@/styles/theme';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useNotification } from '@/app/[lang]/components/Notification';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { PERMISSIONS } from '@/types/organization';
import { activeLanguages } from '@/lib/i18n/settings';
import { vmin } from '@/styles/units';
import PageContainer from '@/app/[lang]/components/PageContainer';

const LANGUAGE_LABELS: Record<string, { name: string; flag: string }> = {
  pl: { name: 'Polski',      flag: '🇵🇱' }, en: { name: 'English',     flag: '🇬🇧' },
  de: { name: 'Deutsch',     flag: '🇩🇪' }, fr: { name: 'Français',    flag: '🇫🇷' },
  es: { name: 'Español',     flag: '🇪🇸' }, it: { name: 'Italiano',    flag: '🇮🇹' },
  pt: { name: 'Português',   flag: '🇵🇹' }, nl: { name: 'Nederlands',  flag: '🇳🇱' },
  cs: { name: 'Čeština',     flag: '🇨🇿' }, sk: { name: 'Slovenčina',  flag: '🇸🇰' },
  hu: { name: 'Magyar',      flag: '🇭🇺' }, ro: { name: 'Română',      flag: '🇷🇴' },
  bg: { name: 'Български',   flag: '🇧🇬' }, hr: { name: 'Hrvatski',    flag: '🇭🇷' },
  sl: { name: 'Slovenščina', flag: '🇸🇮' }, et: { name: 'Eesti',       flag: '🇪🇪' },
  lv: { name: 'Latviešu',    flag: '🇱🇻' }, lt: { name: 'Lietuvių',    flag: '🇱🇹' },
  el: { name: 'Ελληνικά',    flag: '🇬🇷' }, da: { name: 'Dansk',       flag: '🇩🇰' },
  fi: { name: 'Suomi',       flag: '🇫🇮' }, sv: { name: 'Svenska',     flag: '🇸🇪' },
  no: { name: 'Norsk',       flag: '🇳🇴' }, is: { name: 'Íslenska',    flag: '🇮🇸' },
  ga: { name: 'Gaeilge',     flag: '🇮🇪' }, mt: { name: 'Malti',       flag: '🇲🇹' },
  uk: { name: 'Українська',  flag: '🇺🇦' },
};

function SettingsPageContent() {
  const { organization, currentRestaurant, refetch, restaurants = [], setCurrentRestaurant, member } = useOrganization();
  const perms = usePermissions();
  const { showNotification } = useNotification();
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useParams<{ lang: string }>();
  const currentLang = params.lang ?? 'pl';
  const { t } = useTranslation(currentLang, 'settings');

  const handleLanguageChange = (newLang: string) => {
    if (newLang === currentLang) return;
    const segments = pathname.split('/');
    segments[1] = newLang;
    router.push(segments.join('/'));
  };

  const [saving, setSaving] = useState(false);
  // Gastronauta mode toggle — from AuthProvider profile
  const { user, profile, refreshProfile } = useAuth();
  const isGastronauta = profile?.isGastronaut === true;
  const setGastronauta = async (value: boolean) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch('/api/user/update-claims', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGastronaut: value }),
      });
      await user.getIdToken(true);
      refreshProfile();
    } catch (error) {
      console.error('Failed to update gastronaut mode:', error);
    }
  };
  // Lokal select
  const handleRestaurantChange = (e: SelectChangeEvent<string>) => {
    setCurrentRestaurant(e.target.value as string);
  };
  const [restForm, setRestForm] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    timezone: 'Europe/Warsaw',
    bookingDuration: '90',
    currency: 'PLN',
  });

  useEffect(() => {
    if (currentRestaurant) {
      setRestForm({
        name: currentRestaurant.name ?? '',
        phone: currentRestaurant.phone ?? '',
        street: currentRestaurant.address?.street ?? '',
        city: currentRestaurant.address?.city ?? '',
        postalCode: currentRestaurant.address?.postalCode ?? '',
        timezone: currentRestaurant.timezone ?? 'Europe/Warsaw',
        bookingDuration: (currentRestaurant.settings?.bookingDuration ?? 90).toString(),
        currency: currentRestaurant.settings?.currency ?? 'PLN',
      });
    }
  }, [currentRestaurant]);

  const saveRestaurant = async () => {
    if (!organization || !currentRestaurant) return;
    setSaving(true);
    try {
      await updateDoc(
        doc(db, `organizations/${organization.id}/restaurants/${currentRestaurant.id}`),
        {
          name: restForm.name.trim(),
          phone: restForm.phone.trim(),
          address: {
            street: restForm.street.trim(),
            city: restForm.city.trim(),
            postalCode: restForm.postalCode.trim(),
            country: 'Poland',
          },
          timezone: restForm.timezone,
          settings: {
            ...currentRestaurant.settings,
            bookingDuration: parseInt(restForm.bookingDuration) || 90,
            currency: restForm.currency,
          },
        },
      );
      await refetch();
      showNotification(t('settings.saved'), 'success');
    } catch {
      showNotification(t('settings.save_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!currentRestaurant) {
    return (
      <PageContainer sx={{ textAlign: 'center' }}>
        <Typography color="text.secondary">{t('settings.no_restaurant')}</Typography>
      </PageContainer>
    );
  }

  const isReadOnly = !perms.canManageSettings;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 700, mx: 'auto' }}>
      {/* Gastronauta mode toggle + wybór lokalu */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={UI.space.md} alignItems="center" mb={UI.space.lg}>
        <FormControl component="fieldset" sx={{ minWidth: 220 }}>
          <InputLabel id="restaurant-select-label">{t('settings.venue_label')}</InputLabel>
          <Select
            labelId="restaurant-select-label"
            value={currentRestaurant?.id || ''}
            label={t('settings.venue_label')}
            onChange={handleRestaurantChange}
            disabled={restaurants.length < 2}
            sx={{ borderRadius: UI.radius.md }}
          >
            {restaurants.map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {member && (
          <FormControl component="fieldset" sx={{ minWidth: 220 }}>
            <InputLabel id="gastronauta-toggle-label">{t('settings.mode')}</InputLabel>
            <Select
              labelId="gastronauta-toggle-label"
              value={isGastronauta ? 'gastronauta' : 'konsument'}
              label={t('settings.mode')}
              onChange={e => { void setGastronauta(e.target.value === 'gastronauta'); }}
              sx={{ borderRadius: UI.radius.md }}
            >
              <MenuItem value="gastronauta">{t('settings.mode_gastronaut')}</MenuItem>
              <MenuItem value="konsument">{t('settings.mode_consumer')}</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <SettingsIcon color="primary" />
        <Typography variant="h5" fontWeight={700} color="text.primary">{t('settings.title')}</Typography>
      </Stack>

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('settings.readonly_info')}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Basic info */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.primary">{t('settings.basic_info')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <TextField
                label={t('settings.restaurant_name')}
                value={restForm.name}
                onChange={(e) => setRestForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                disabled={isReadOnly}
              />
              <TextField
                label={t('settings.phone')}
                value={restForm.phone}
                onChange={(e) => setRestForm((f) => ({ ...f, phone: e.target.value }))}
                fullWidth
                disabled={isReadOnly}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Address */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.primary">{t('settings.address')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <TextField
                label={t('settings.street')}
                value={restForm.street}
                onChange={(e) => setRestForm((f) => ({ ...f, street: e.target.value }))}
                fullWidth
                disabled={isReadOnly}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('settings.city')}
                  value={restForm.city}
                  onChange={(e) => setRestForm((f) => ({ ...f, city: e.target.value }))}
                  fullWidth
                  disabled={isReadOnly}
                />
                <TextField
                  label={t('settings.postal_code')}
                  value={restForm.postalCode}
                  onChange={(e) => setRestForm((f) => ({ ...f, postalCode: e.target.value }))}
                  sx={{ width: 160 }}
                  disabled={isReadOnly}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Booking settings */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.primary">{t('settings.booking')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <TextField
                label={t('settings.booking_duration')}
                type="number"
                value={restForm.bookingDuration}
                onChange={(e) => setRestForm((f) => ({ ...f, bookingDuration: e.target.value }))}
                fullWidth
                disabled={isReadOnly}
                inputProps={{ min: 15, max: 480, step: 15 }}
                helperText={t('settings.booking_duration_help')}
              />
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>{t('settings.timezone')}</InputLabel>
                <Select
                  value={restForm.timezone}
                  label={t('settings.timezone')}
                  onChange={(e) => setRestForm((f) => ({ ...f, timezone: e.target.value }))}
                >
                  <MenuItem value="Europe/Warsaw">Europa/Warszawa (CET/CEST)</MenuItem>
                  <MenuItem value="Europe/London">Europa/Londyn (GMT/BST)</MenuItem>
                  <MenuItem value="Europe/Berlin">Europa/Berlin (CET/CEST)</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>{t('settings.currency')}</InputLabel>
                <Select
                  value={restForm.currency}
                  label={t('settings.currency')}
                  onChange={(e) => setRestForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <MenuItem value="PLN">PLN — {t('settings.pln')}</MenuItem>
                  <MenuItem value="EUR">EUR — {t('settings.eur')}</MenuItem>
                  <MenuItem value="GBP">GBP — {t('settings.gbp')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Language */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <LanguageIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.primary">{t('settings.language_title')}</Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <FormControl fullWidth>
              <InputLabel>{t('settings.language_label')}</InputLabel>
              <Select
                value={currentLang}
                label={t('settings.language_label')}
                onChange={(e) => handleLanguageChange(e.target.value)}
                renderValue={(val) => {
                  const l = LANGUAGE_LABELS[val] ?? { name: val, flag: '🌐' };
                  return (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span style={{ fontSize: '1.1rem' }}>{l.flag}</span>
                      <Typography variant="body2">{l.name}</Typography>
                    </Stack>
                  );
                }}
              >
                {activeLanguages.map((lang) => {
                  const l = LANGUAGE_LABELS[lang] ?? { name: lang, flag: '🌐' };
                  return (
                    <MenuItem key={lang} value={lang} selected={lang === currentLang}>
                      <ListItemIcon sx={{ minWidth: `${vmin(36)} !important`, fontSize: '1.1rem' }}>
                        {l.flag}
                      </ListItemIcon>
                      <ListItemText>
                        <Typography variant="body2" fontWeight={lang === currentLang ? 700 : 400}>
                          {l.name}
                        </Typography>
                      </ListItemText>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Organization info (read-only) */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.primary">{t('settings.organization')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              <Typography variant="body2">
                <b>{t('settings.org_name')}:</b> {organization?.name}
              </Typography>
              <Typography variant="body2">
                <b>{t('settings.org_plan')}:</b> {organization?.plan?.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                <b>{t('settings.org_slug')}:</b> {organization?.slug}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <PermissionGate permission={PERMISSIONS.SETTINGS_MANAGE}>
          <Button
            variant="contained"
            size="large"
            onClick={saveRestaurant}
            disabled={saving}
            sx={{ alignSelf: 'flex-start' }}
          >
            {saving ? <CircularProgress size={22} /> : t('settings.save_btn')}
          </Button>
        </PermissionGate>
      </Stack>
    </Box>
  );
}

export default function SettingsPage() {
  return (
    <RequireOrganization>
      <SettingsPageContent />
    </RequireOrganization>
  );
}
