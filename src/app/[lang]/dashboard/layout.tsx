'use client';

import React, { type ReactNode, useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box, Typography, Drawer, IconButton, CircularProgress,
  Avatar, List, ListItemButton, ListItemIcon, ListItemText,
  Stack, MenuItem, Select, useTheme, Tooltip, useMediaQuery
} from '@mui/material';

// Nav icons
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import KitchenIcon from '@mui/icons-material/Kitchen';
import TableBarIcon from '@mui/icons-material/TableBar';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import GroupIcon from '@mui/icons-material/Group';
import EventNoteIcon from '@mui/icons-material/EventNote';
import InventoryIcon from '@mui/icons-material/Inventory2';

// Admin icons
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import RouterIcon from '@mui/icons-material/Router';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';


import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '../providers/AuthProvider';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useOrganization } from '../providers/OrganizationProvider';
import { format } from 'date-fns';
import { useThemeMode, alpha } from '../components/ThemeRegistry';
import SessionContextStrip from '../components/SessionContextStrip';
import CommandSearch from './components/CommandSearch';
import { UI } from '@/styles/theme';

import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';

// ─── Constants ───────────────────────────────────────────────────────────────

const APP_VERSION = '0.1.0';
const DRAWER_W    = UI.appShell.drawerW;
const TOP_BAR_H   = UI.appShell.topBarH;
const FOOTER_H    = UI.appShell.footerH;

const ROLE_KEYS = ['owner', 'admin', 'manager', 'waiter', 'chef', 'staff'] as const;

// ─── Hooki nawigacji ─────────────────────────────────────────────────────────

type NavItem = { label: string; icon: React.ReactNode; path: string; section?: 'ops' | 'mgmt' };

function useNavItems(lang: string, t: (key: string) => string): NavItem[] {
  const perms = usePermissions();
  const p = `/${lang}/dashboard`;
  return [
    // ── Operations (daily work) ──
    { label: t('dashboard.nav.dashboard'), icon: <HomeIcon />,              path: p                     },
    ...(perms.canViewMenu
      ? [{ label: t('dashboard.nav.floor'),    icon: <TableBarIcon />,      path: `${p}/floorplan`     }] : []),
    ...(perms.canManageOrders
      ? [{ label: t('dashboard.nav.orders'),   icon: <ReceiptLongIcon />,   path: `${p}?page=orders`   }] : []),
    ...(perms.canViewBookings
      ? [{ label: t('dashboard.nav.bookings'), icon: <CalendarMonthIcon />, path: `${p}?page=bookings` }] : []),
    ...(perms.canViewKitchen
      ? [{ label: t('dashboard.nav.kitchen'),  icon: <KitchenIcon />,       path: `${p}?page=kitchen`  }] : []),
    // ── Management ──
    ...(perms.canViewMenu
      ? [{ label: t('dashboard.nav.menu'),     icon: <RestaurantMenuIcon />, path: `${p}/menu`,      section: 'mgmt' as const }] : []),
    { label: t('dashboard.nav.team'),          icon: <GroupIcon />,          path: `${p}/team`,      section: 'mgmt' as const },
    { label: t('dashboard.nav.schedule'),      icon: <EventNoteIcon />,      path: `${p}/schedule`,  section: 'mgmt' as const },
    ...(perms.canViewMenu
      ? [{ label: t('dashboard.nav.inventory'),icon: <InventoryIcon />,      path: `${p}/inventory`, section: 'mgmt' as const }] : []),
  ];
}

function useAdminItems(lang: string, t: (key: string) => string) {
  const perms = usePermissions();
  const p = `/${lang}/dashboard`;
  return [
    ...(perms.canViewSettings
      ? [{ label: t('dashboard.nav.settings'),      icon: <SettingsIcon />,  path: `${p}/settings`     }] : []),
    ...(perms.canViewIntegrations
      ? [{ label: t('dashboard.nav.integrations'),  icon: <BusinessIcon />,  path: `${p}/integrations` }] : []),
    { label: t('dashboard.nav.analytics'),           icon: <BarChartIcon />,  path: `${p}/payments`     },
    { label: t('dashboard.nav.iot_config'),           icon: <RouterIcon />,    path: null                },
  ];
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

function AppDrawer({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: string;
}) {
  const router  = useRouter();
  const pathname = usePathname() ?? '';
  const theme = useTheme();
  const { user, profile } = useAuth();
  const { member, organization, restaurants, currentRestaurant, setCurrentRestaurant } = useOrganization();
  const { t } = useTranslation(lang, 'dashboard');
  const navItems   = useNavItems(lang, t);
  const adminItems = useAdminItems(lang, t);
  const isGastronaut = profile?.isGastronaut === true;

  const displayName  = user?.displayName ?? user?.email ?? '';
  const roleKey      = member?.role ?? 'staff';
  const roleLabel    = t(`dashboard.roles.${roleKey}`) || roleKey;
  const locationName = currentRestaurant?.name ?? organization?.name ?? 'gastroo';
  const multiLoc     = restaurants.length > 1;
  const initial      = displayName[0]?.toUpperCase() ?? '?';

  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page') ?? '';

  const navigate = (path: string | null) => {
    if (!path) return;
    router.push(path);
    onClose();
  };

  const isActive = (path: string) => {
    const [base, qs] = path.split('?');
    const pageParam = qs ? new URLSearchParams(qs).get('page') : null;
    if (pageParam) return pathname === base && currentPage === pageParam;
    if (base === `/${lang}/dashboard`) return pathname === base && !currentPage;
    return pathname.startsWith(base);
  };

  const handleLock = () => {
    sessionStorage.removeItem('gastroo_pinpad_uid');
    sessionStorage.removeItem('gastroo_pinpad_role');
    router.replace(`/${lang}/pinpad`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('gastroo_has_logged_in');
    router.replace(`/${lang}/login`);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="temporary"
      anchor="left"
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: DRAWER_W,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
          border: 'none',
          boxShadow: `8px 0 24px -4px ${alpha(theme.palette.text.primary, 0.08)}`,
          borderRadius: '0 16px 16px 0',
        },
      }}
    >
      {/* ── Profil użytkownika ── */}
      <Box sx={{ px: 1.5, pt: 2, pb: 1.25 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: 'primary.main',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.775rem', lineHeight: 1.3 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
              {roleLabel}
            </Typography>
          </Box>
        </Stack>

        {/* Wybór lokalu — tonal shift instead of border */}
        <Box
          sx={{
            mt: 1,
            px: 1,
            py: 0.5,
            borderRadius: '10px',
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <RestaurantIcon sx={{ fontSize: '0.85rem', color: 'primary.main', flexShrink: 0 }} />
          {multiLoc ? (
            <Select
              value={currentRestaurant?.id ?? ''}
              onChange={(e) => setCurrentRestaurant(e.target.value)}
              variant="standard"
              disableUnderline
              fullWidth
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                '& .MuiSelect-select': { py: 0, pr: '20px !important' },
                '& .MuiSelect-icon': { fontSize: '0.9rem', color: 'text.disabled' },
              }}
            >
              {restaurants.map((r) => (
                <MenuItem key={r.id} value={r.id} sx={{ fontSize: '0.75rem' }}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.75rem' }}>
              {locationName}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Section separator: spacing only, no Divider */}
      <Box sx={{ height: 8 }} />

      {/* ── Nawigacja główna ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.25 }}>
        <List dense disablePadding>
          {navItems.map((item, idx) => {
            const active = isActive(item.path);
            const prevItem = idx > 0 ? navItems[idx - 1] : null;
            const showMgmtHeader = item.section === 'mgmt' && prevItem?.section !== 'mgmt';
            return (
              <React.Fragment key={item.path}>
                {showMgmtHeader && (
                  <Typography variant="overline" sx={{ px: 1.5, pt: 1, pb: 0.25, display: 'block', color: 'text.disabled' }}>
                    {t('dashboard.nav.section_mgmt')}
                  </Typography>
                )}
                <ListItemButton
                  selected={active}
                  onClick={() => navigate(item.path)}
                  sx={{
                    mx: 0.75,
                    borderRadius: '10px',
                    py: 0.5,
                    minHeight: 32,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      '&:hover': { bgcolor: 'primary.light' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, '& .MuiSvgIcon-root': { fontSize: '1.1rem' }, color: active ? 'inherit' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: active ? 700 : 500 }}
                  />
                </ListItemButton>
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Section gap */}
      <Box sx={{ height: 8 }} />

      {/* ── Panel administracyjny ── */}
      <Box sx={{ py: 0.25, bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
        <Typography variant="overline" sx={{ px: 1.5, pt: 0.5, pb: 0.25, display: 'block', color: 'text.disabled' }}>
          {t('dashboard.nav.section_admin')}
        </Typography>
        <List dense disablePadding>
          {adminItems.map((item) => {
            const active = item.path ? isActive(item.path) : false;
            const disabled = item.path === null;
            return (
              <ListItemButton
                key={item.label}
                selected={active}
                disabled={disabled}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 0.75,
                  borderRadius: '6px',
                  py: 0.5,
                  minHeight: 32,
                  opacity: disabled ? 0.4 : 1,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 28, '& .MuiSvgIcon-root': { fontSize: '1.1rem' }, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={disabled ? t('dashboard.nav.coming_soon') : undefined}
                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: '0.65rem' }}
                />
              </ListItemButton>
            );
          })}

          {/* Lock (gastronaut) or Logout (non-gastronaut) */}
          {isGastronaut ? (
            <ListItemButton
              onClick={handleLock}
              sx={{
                mx: 0.75,
                borderRadius: '6px',
                py: 0.5,
                minHeight: 32,
                mt: 0.5,
                color: 'warning.main',
                '& .MuiListItemIcon-root': { color: 'warning.main' },
                '&:hover': { bgcolor: 'warning.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } },
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}>
                <LockIcon />
              </ListItemIcon>
              <ListItemText
                primary={t('dashboard.nav.lock')}
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
              />
            </ListItemButton>
          ) : (
            <ListItemButton
              onClick={handleLogout}
              sx={{
                mx: 0.75,
                borderRadius: '6px',
                py: 0.5,
                minHeight: 32,
                mt: 0.5,
                color: 'error.main',
                '& .MuiListItemIcon-root': { color: 'error.main' },
                '&:hover': { bgcolor: 'error.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } },
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary={t('dashboard.nav.logout')}
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
              />
            </ListItemButton>
          )}

          {/* Device logout — only for owner/admin in gastronaut mode */}
          {isGastronaut && ['owner', 'admin'].includes(roleKey) && (
            <ListItemButton
              onClick={handleLogout}
              sx={{
                mx: 0.75,
                borderRadius: '6px',
                py: 0.5,
                minHeight: 32,
                mt: 0.25,
                color: 'error.main',
                opacity: 0.6,
                '& .MuiListItemIcon-root': { color: 'error.main' },
                '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.error.main, 0.08) },
                transition: 'all 0.15s',
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary={t('dashboard.nav.device_logout')}
                primaryTypographyProps={{ fontSize: '0.7rem', fontWeight: 600 }}
              />
            </ListItemButton>
          )}
        </List>

        {/* Wersja */}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ px: 1.5, pb: 0.75, pt: 0.5, display: 'block', fontSize: '0.6rem' }}
        >
          gastroo v{APP_VERSION}
        </Typography>
      </Box>
    </Drawer>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, profile } = useAuth();
  const { organization, currentRestaurant, member } = useOrganization();
  const router  = useRouter();
  const params  = useParams<{ lang: string }>();
  const lang    = params.lang;
  const isGastronaut = profile?.isGastronaut === true;
  const theme = useTheme();
  const isMobileTopBar = useMediaQuery(theme.breakpoints.down('sm'));

  const { t } = useTranslation(lang, 'dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDark = theme.palette.mode === 'dark';
  const { toggleMode } = useThemeMode();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${lang}/login`);
  }, [user, loading, router, lang]);

  // Auto-lock: redirect gastronaut to PINpad after inactivity timeout
  useEffect(() => {
    if (!isGastronaut || !user) return;

    const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.removeItem('gastroo_pinpad_uid');
        sessionStorage.removeItem('gastroo_pinpad_role');
        router.replace(`/${lang}/pinpad`);
      }, LOCK_TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isGastronaut, user, router, lang]);

  if (loading || !user) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const locationName = currentRestaurant?.name ?? organization?.name ?? 'gastroo';
  const organizationName = organization?.name ?? '—';
  const handleTopBarAction = () => {
    if (isGastronaut) {
      // Lock — back to PINpad, keep device session
      sessionStorage.removeItem('gastroo_pinpad_uid');
      sessionStorage.removeItem('gastroo_pinpad_role');
      router.replace(`/${lang}/pinpad`);
    } else {
      signOut(auth).then(() => {
        localStorage.removeItem('gastroo_has_logged_in');
        router.replace(`/${lang}/login`);
      });
    }
  };
  const displayName = user?.displayName || user?.email || t('dashboard.nav.user_fallback');
  const roleKey = member?.role ?? '';
  const roleLabel = roleKey ? (t(`dashboard.roles.${roleKey}`) || roleKey) : '—';
  const currentYear = new Date().getFullYear();
  const copyrightYears = currentYear === 2026 ? '2026' : `2026–${currentYear}`;

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>

      {/* ── Top bar — Glassmorphism floating nav ── */}
      <Box
        sx={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: TOP_BAR_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 1,
          px: 1.5,
          zIndex: 1200,
          bgcolor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          // No border — tonal shift only
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            size="small"
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            <RestaurantIcon sx={{ fontSize: '0.875rem', color: 'primary.main' }} />
            <SessionContextStrip
              locationName={locationName}
              organizationName={isMobileTopBar ? undefined : organizationName}
            />
          </Stack>
        </Stack>

        <CommandSearch />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 'auto', flexShrink: 0 }}>
          {/* Ikony alertów i pomocy */}
          {!isMobileTopBar && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mx: 1 }}>
              <Tooltip title={t('dashboard.nav.alerts') || 'Alerty'}>
                <IconButton size="small" aria-label={t('dashboard.nav.alerts') || 'Alerty'} sx={{ color: 'text.secondary' }}>
                  <NotificationImportantIcon sx={{ fontSize: '1.15rem' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('dashboard.nav.help') || 'Pomoc'}>
                <IconButton size="small" aria-label={t('dashboard.nav.help') || 'Pomoc'} sx={{ color: 'text.secondary' }}>
                  <HelpOutlineIcon sx={{ fontSize: '1.15rem' }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {!isMobileTopBar && (
            <SessionContextStrip
              locationName=""
              userLabel={displayName}
              roleLabel={roleLabel}
              align="right"
            />
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
            suppressHydrationWarning
          >
            {now instanceof Date
              ? format(now, isMobileTopBar ? 'dd/MM HH:mm' : 'dd/MM/yyyy | HH:mm:ss')
              : (isMobileTopBar ? '--/-- --:--' : '--/--/---- | --:--:--')}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title={isDark ? t('dashboard.nav.theme_light') : t('dashboard.nav.theme_dark')}>
              <IconButton size="small" onClick={toggleMode} aria-label={t('dashboard.nav.toggle_theme')} sx={{ color: 'text.secondary' }}>
                {isDark ? <Brightness7Icon sx={{ fontSize: '1rem' }} /> : <Brightness4Icon sx={{ fontSize: '1rem' }} />}
              </IconButton>
            </Tooltip>

            <Tooltip title={isGastronaut ? t('dashboard.nav.lock') : t('dashboard.nav.logout')}>
              <IconButton
                size="small"
                onClick={handleTopBarAction}
                aria-label={isGastronaut ? t('dashboard.nav.lock') : t('dashboard.nav.logout')}
                sx={{
                  color: isGastronaut ? 'warning.main' : 'error.main',
                  '&:hover': {
                    bgcolor: isGastronaut ? 'warning.main' : 'error.main',
                    color: 'white',
                  },
                }}
              >
                {isGastronaut
                  ? <LockIcon sx={{ fontSize: '1rem' }} />
                  : <LogoutIcon sx={{ fontSize: '1rem' }} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* ── Side drawer ── */}
      <Suspense>
        <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} lang={lang} />
      </Suspense>

      {/* ── Treść — surface_dim background for admin ── */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          paddingTop: `calc(${TOP_BAR_H} + env(safe-area-inset-top))`,
          paddingBottom: `calc(${FOOTER_H} + env(safe-area-inset-bottom))`,
          bgcolor: isDark ? 'background.default' : alpha(theme.palette.text.primary, 0.02),
        }}
      >
        {children}
      </Box>

      {/* ── Footer — Glassmorphism ── */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: FOOTER_H,
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          zIndex: 1200,
          bgcolor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingBottom: `calc(env(safe-area-inset-bottom) + 4px)`,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', lineHeight: 1.2, fontSize: '0.6rem' }}
            noWrap
          >
            v{APP_VERSION} &middot;{' '}
            <Box
              component={Link}
              href={`/${lang}?landing=1`}
              sx={{ color: 'text.secondary', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
            >
              gastroo.space
            </Box>{' '}
            {copyrightYears}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
