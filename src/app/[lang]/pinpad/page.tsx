'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, alpha, Select, MenuItem, Switch, Stack, useMediaQuery } from '@mui/material';
import BackspaceIcon from '@mui/icons-material/Backspace';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { useAuth } from '../providers/AuthProvider';
import { useOrganization } from '../providers/OrganizationProvider';

import { TEST_IDS } from '@/lib/testing/selectors';
import { PIN_LENGTH } from '@/lib/validation/pinSchema';
import { findMemberByPin } from '@/lib/validation/pinSchema';
import { useTranslation } from '@/lib/i18n/client';
import { UI } from '@/styles/theme';
const NUMPAD_BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'BACKSPACE'],
];

export default function PinpadPage() {
  const { user, loading, setViewMode } = useAuth();
  const { organization, currentRestaurant, organizationOptions, switchContext, refetch } = useOrganization();

  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang || 'pl';
  const { t } = useTranslation(lang, 'pinpad');
  const theme = useTheme();
  const isMobileHeader = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSwitchToFoodie = async () => {
    await setViewMode('foodie');
    router.push(`/${lang}/space`);
  };

  const [viewReady, setViewReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [pin, setPin] = useState('');
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'invalid'>('idle');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Wymuś refetch organizacji/membershipów po wejściu na PINpad
  useEffect(() => {
    refetch?.().then(() => {
      // LOG: po refetchu organizacji/membershipów
      // eslint-disable-next-line no-console
      console.log('[PINPAD-DEBUG] organizationOptions', organizationOptions);
      // eslint-disable-next-line no-console
      console.log('[PINPAD-DEBUG] organization', organization);
      // eslint-disable-next-line no-console
      console.log('[PINPAD-DEBUG] currentRestaurant', currentRestaurant);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('gastronauta', '1');
    setViewReady(true);
  }, []);

  // PINpad jest ekranem "lock screen" — nie przekierowujemy zalogowanego użytkownika.
  // Właściciel loguje się raz, a PINpad służy do identyfikacji pracownika (PIN zmiany).

  const handlePinLogin = useCallback(async () => {
    if (pin.length !== PIN_LENGTH) {
      setPinStatus('invalid');
      setPinError(t('pinpad.errors.invalidLength', { length: PIN_LENGTH }));
      return;
    }

    if (!organization?.id) {
      setPinStatus('invalid');
      setPinError(t('pinpad.errors.noOrganization'));
      return;
    }

    setPinStatus('checking');
    setPinError('');

    try {
      // LOG: pokaż parametry wejściowe
      console.log('[PINPAD-DEBUG] Próba logowania PIN', { orgId: organization.id, pin });
      const member = await findMemberByPin(organization.id, pin);

      if (!member) {
        setPinStatus('invalid');
        setPinError(t('pinpad.errors.invalidPin'));
        setPin('');
        // LOG: brak membera
        console.warn('[PINPAD-DEBUG] Brak membera dla', { orgId: organization.id, pin });
        return;
      }

      // PIN found — store identified staff member in sessionStorage and navigate
      sessionStorage.setItem('gastroo_pinpad_uid', member.uid);
      sessionStorage.setItem('gastroo_pinpad_role', member.role);
      console.log('[PINPAD-DEBUG] Zalogowano membera', member);
      router.push(`/${lang}/dashboard`);
    } catch (err) {
      setPinStatus('invalid');
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PINPAD-DEBUG] PIN login error', { orgId: organization.id, error: msg, err });
      // Show specific error in dev, generic in prod
      setPinError(process.env.NODE_ENV === 'development'
        ? `${t('pinpad.errors.loginFailed')}: ${msg}`
        : t('pinpad.errors.loginFailed'));
      setPin('');
    }
  }, [pin, lang, organization, router]);

  const handleKey = useCallback((key: string) => {
    if (pinStatus === 'checking') return;

    if (key === 'BACKSPACE') {
      setPin((prev) => prev.slice(0, -1));
      setPinStatus('idle');
      setPinError('');
      return;
    }

    if (/^\d$/.test(key) && pin.length < PIN_LENGTH) {
      setPin((prev) => prev + key);
      setPinStatus('idle');
    }
  }, [pin, pinStatus]);

  // Auto-submit when PIN reaches full length
  useEffect(() => {
    if (pin.length === PIN_LENGTH && pinStatus === 'idle') {
      handlePinLogin();
    }
  }, [pin, pinStatus, handlePinLogin]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        handleKey(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        handleKey('BACKSPACE');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKey]);

  // No signOut on PINpad — device session persists.
  // True logout is only available in dashboard settings (owner/admin).

  if (loading || !viewReady) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      data-testid={TEST_IDS.pinpad.layout}
      sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', color: 'text.primary', userSelect: 'none', overflow: 'hidden', bgcolor: 'background.default' }}
    >
      {/* ── Header — matching dashboard top bar ── */}
      <Box
        sx={{
          px: 1.5,
          py: { xs: 1, sm: 0 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
          alignItems: { xs: 'start', sm: 'center' },
          columnGap: 2,
          rowGap: 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          paddingTop: 'env(safe-area-inset-top)',
          minHeight: { sm: UI.appShell.topBarH },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '-0.04em', flexShrink: 0 }} noWrap>
            gastroo<Typography component="span" sx={{ color: 'primary.main', fontWeight: 900 }}>.</Typography>space
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            {user?.email && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500, display: 'block', lineHeight: 1.2 }} noWrap>
                {user.email}
              </Typography>
            )}
            {organizationOptions.length > 1 && (
              <Select
                size="small"
                variant="standard"
                disableUnderline
                value={`${organization?.id}:${currentRestaurant?.id ?? ''}`}
                onChange={(e) => {
                  const [orgId, restId] = (e.target.value as string).split(':');
                  if (orgId && restId) void switchContext(orgId, restId);
                }}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  maxWidth: { xs: '100%', sm: 'min(30rem, 48vw)' },
                  '& .MuiSelect-select': { py: 0 },
                }}
              >
                {organizationOptions.map((opt) => (
                  <MenuItem key={`${opt.orgId}:${opt.restaurantId}`} value={`${opt.orgId}:${opt.restaurantId}`} sx={{ fontSize: '0.7rem' }}>
                    {organizationOptions.some((o) => o.orgId !== opt.orgId)
                      ? `${opt.orgName} — ${opt.restaurantName}`
                      : opt.restaurantName}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: { xs: 'space-between', sm: 'flex-end' },
            gap: 1.5,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              fontSize: UI.pinpad.helperFont,
              whiteSpace: 'nowrap',
            }}
            suppressHydrationWarning
          >
            {now
              ? (isMobileHeader ? format(now, 'HH:mm') : format(now, 'dd/MM/yyyy | HH:mm:ss'))
              : (isMobileHeader ? '--:--' : '--/--/---- | --:--:--')}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              variant="caption"
              sx={{
                fontSize: UI.pinpad.helperFont,
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              Foodie
            </Typography>
            <Switch size="small" onChange={handleSwitchToFoodie} />
          </Stack>
        </Box>
      </Box>

      {/* ── PIN content ── */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, px: 2, py: 3 }}>
        {/* PIN Display — naked, no border/shadow */}
        <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
            {t('pinpad.inputLabel')}
          </Typography>
          <Typography
            data-testid={TEST_IDS.pinpad.input}
            sx={{
              fontSize: '2.5rem',
              fontWeight: 900,
              letterSpacing: '0.3em',
              fontVariantNumeric: 'tabular-nums',
              minHeight: '3.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: pin ? 'text.primary' : 'text.disabled',
            }}
          >
            {pin ? '●'.repeat(pin.length) : '····'}
          </Typography>
          {pinError && (
            <Typography color="error" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              {pinError}
            </Typography>
          )}
        </Box>

        {/* Numpad */}
        <Box sx={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NUMPAD_BUTTONS.map((row, rowIndex) => (
            <Box key={rowIndex} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {row.map((key) => (
                <Button
                  key={key || `empty-${rowIndex}`}
                  onClick={() => handleKey(key)}
                  disabled={pinStatus === 'checking' || !key}
                  variant={key === 'BACKSPACE' || key === 'ENTER' ? 'outlined' : 'contained'}
                  sx={{
                    py: 2.5,
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    borderRadius: '12px',
                    minHeight: 60,
                    opacity: !key ? 0 : 1,
                    visibility: !key ? 'hidden' : 'visible',
                  }}
                  data-testid={TEST_IDS.pinpad.key(key)}
                >
                  {key === 'BACKSPACE' ? <BackspaceIcon /> : key === 'ENTER' ? 'OK' : key}
                </Button>
              ))}
            </Box>
          ))}
        </Box>

        {pinStatus === 'checking' && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.background.default, 0.5), backdropFilter: 'blur(4px)' }}>
            <CircularProgress />
          </Box>
        )}
      </Box>
    </Box>
  );
}
