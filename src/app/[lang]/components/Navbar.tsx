// src/app/[lang]/components/Navbar.tsx
'use client';

import React, { useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemText,
  useTheme, useMediaQuery, Divider, Select, MenuItem,
  FormControl, alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import StoreIcon from '@mui/icons-material/Store';
import { NotificationBell } from './NotificationBell';
import Link from 'next/link';
import { useAuth } from '../providers/AuthProvider';
import { useOrganization } from '../providers/OrganizationProvider';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import LanguageSwitcher from './LanguageSwitcher';
import { vh, vmin, vw } from '@/styles/units';
import { UI } from '@/styles/theme';

const loggedOutNavItems = [
  { key: 'offer', hash: '#offer' },
  { key: 'demo', href: '/demo' },
];

export default function Navbar() {
  const { user } = useAuth();
  const { organization, restaurants, currentRestaurant, setCurrentRestaurant } = useOrganization();
  const perms = usePermissions();

  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = params.lang || 'pl';

  const loggedInNavItems = [
    ...(perms.canViewBookings
      ? [{ key: 'bookings', href: `/${currentLang}/dashboard/bookings` }]
      : []),
    ...(perms.canViewMenu
      ? [{ key: 'menu', href: `/${currentLang}/dashboard/menu` }]
      : []),
    ...(perms.canViewStaff
      ? [{ key: 'team', href: `/${currentLang}/dashboard/team` }]
      : []),
    ...(perms.canViewSettings
      ? [{ key: 'settings', href: `/${currentLang}/dashboard/settings` }]
      : []),
    ...(perms.canManageSettings
      ? [{ key: 'floorplan', href: `/${currentLang}/dashboard/floorplan` }]
      : []),
    ...(perms.canViewIntegrations
      ? [{ key: 'integrations', href: `/${currentLang}/dashboard/integrations` }]
      : []),
  ];
  const { t } = useTranslation(params.lang, 'navigation');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));


  const isLandingPage = pathname === `/${currentLang}` || pathname === `/${currentLang}/`;
  const logoHref = user ? `/${currentLang}?landing=1` : `/${currentLang}`;

  const toggleHighContrast = () => {
    const current = localStorage.getItem('gastroo_high_contrast') === 'true';
    localStorage.setItem('gastroo_high_contrast', String(!current));
    window.location.reload();
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push(`/${params.lang}/demo`);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Zawartość wysuwanej szuflady (menu mobilne)
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }} component="nav" aria-label={t('nav.menu')}>
      <Typography variant="h6" sx={{ my: '2vh' }} id="mobile-menu-title">
        Menu
      </Typography>
      <Divider />
      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
        <LanguageSwitcher />
      </Box>
      <Divider />
      <List>
        {user ? (
          // Linki dla zalogowanego użytkownika
          <>
            {loggedInNavItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton component={Link} href={item.href}>
                  <ListItemText primary={t(`nav.${item.key}`)} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider />
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary={t('nav.logout')} />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          // Linki dla wylogowanego użytkownika
          <>
            {loggedOutNavItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href ? `/${currentLang}${item.href}` : `/${currentLang}${item.hash}`}
                >
                  <ListItemText primary={t(`nav.${item.key}`)} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton component={Link} href={`/${currentLang}/login`}>
                <ListItemText primary={t('nav.login')} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position={isLandingPage ? 'fixed' : 'sticky'} 
        color="transparent" 
        elevation={0}
        component="nav"
        aria-label="Main Navigation"
        sx={{
          backdropFilter: `blur(${vmin(20)})`,
          WebkitBackdropFilter: `blur(${vmin(20)})`,
          borderBottom: 1,
          borderColor: isDark ? 'rgba(197,160,89,0.15)' : 'rgba(0,0,0,0.08)',
          backgroundColor: isDark 
            ? 'rgba(8,8,8,0.75)' 
            : 'rgba(249,248,243,0.75)',
          top: isLandingPage ? vh(8) : 0,
          left: isLandingPage ? '50%' : undefined,
          transform: isLandingPage ? 'translateX(-50%)' : undefined,
          width: isLandingPage ? { xs: '92vw', md: '78vw' } : '100%',
          borderRadius: isLandingPage ? vmin(18) : 0,
          borderStyle: 'solid',
          borderWidth: isLandingPage ? UI.borderWidth.hair : 0,
          zIndex: theme.zIndex.appBar,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            component={Link}
            href={logoHref}
            sx={{ 
              textDecoration: 'none', 
              color: 'text.primary',
              fontWeight: 900,
              fontSize: '1.4rem',
              letterSpacing: '-0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '& span': {
                color: 'primary.main',
                fontSize: '1.6rem',
                lineHeight: 0
              }
            }}
          >
            gastroo<span>.</span>space
          </Typography>

          {/* Mobile hamburger — hidden on desktop via CSS (no hydration mismatch) */}
          <IconButton
            color="inherit"
            onClick={handleDrawerToggle}
            aria-label={t('nav.open_menu')}
            aria-expanded={drawerOpen}
            sx={{ display: { xs: 'flex', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Desktop nav — hidden on mobile via CSS */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: '1vw' }}>
              <LanguageSwitcher />

              {user && organization && restaurants.length > 0 && !isLandingPage && (
                <FormControl size="small" sx={{ minWidth: '12vw' }}>
                  <Select
                    value={currentRestaurant?.id || ''}
                    onChange={(e) => setCurrentRestaurant(e.target.value)}
                    displayEmpty
                    startAdornment={<StoreIcon sx={{ mr: 1, fontSize: '1.2rem', opacity: 0.7 }} />}
                    sx={{
                      borderRadius: vmin(12),
                      '& .MuiSelect-select': {
                        py: vh(8),
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }
                    }}
                  >
                    {restaurants.map((restaurant) => (
                      <MenuItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Ikona powiadomień z badge i panel */}
                {user && !isLandingPage && <NotificationBell userId={user.uid} />}
                {user ? (
                  <>
                    {isLandingPage ? (
                      <Button 
                        variant="contained" 
                        color="primary"
                        component={Link} 
                        href={`/${params.lang}/dashboard`}
                        sx={{ 
                          fontWeight: 900,
                          borderRadius: vmin(12),
                          boxShadow: `0 ${vmin(10)} ${vmin(20)} calc(-1 * ${vmin(5)}) ${alpha(theme.palette.primary.main, 0.4)}`
                        }}
                      >
                        {t('nav.login')}
                      </Button>
                    ) : (
                      <>
                        {loggedInNavItems.map((item) => (
                          <Button 
                            key={item.key} 
                            color="inherit" 
                            component={Link} 
                            href={item.href}
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              px: 2,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': { 
                                transform: `translateY(calc(-1 * ${vmin(2)}))`,
                                color: 'primary.main'
                              }
                            }}
                          >
                            {t(`nav.${item.key}`)}
                          </Button>
                        ))}
                        <Button 
                          variant="outlined" 
                          onClick={handleLogout} 
                          sx={{ 
                            ml: 1,
                            borderRadius: vmin(12),
                            borderColor: isDark ? 'rgba(197,160,89,0.3)' : 'rgba(0,0,0,0.1)',
                            color: 'text.secondary',
                            fontWeight: 700,
                            '&:hover': { 
                              borderColor: 'error.main', 
                              color: 'error.main',
                              bgcolor: alpha(theme.palette.error.main, 0.05)
                            }
                          }}
                        >
                          {t('nav.logout')}
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {loggedOutNavItems.map((item) => (
                      <Button 
                        key={item.key} 
                        color="inherit" 
                        component={Link} 
                        href={item.href ? `/${currentLang}${item.href}` : `/${currentLang}${item.hash}`}
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          px: 2,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': { 
                            transform: `translateY(calc(-1 * ${vmin(2)}))`,
                            color: 'primary.main'
                          }
                        }}
                      >
                        {t(`nav.${item.key}`)}
                      </Button>
                    ))}
                    <Button 
                      variant="contained" 
                      color="primary"
                      component={Link} 
                      href={`/${params.lang}/login`} 
                      sx={{ 
                        ml: 2, 
                        fontWeight: 900,
                        borderRadius: vmin(12),
                        boxShadow: `0 ${vmin(10)} ${vmin(20)} calc(-1 * ${vmin(5)}) ${alpha(theme.palette.primary.main, 0.4)}`
                      }}
                    >
                      {t('nav.login')}
                    </Button>
                  </>
                )}
              </Box>
            </Box> {/* desktop nav */}
        </Toolbar>
      </AppBar>
      <Drawer 
        anchor="right" 
        open={drawerOpen} 
        onClose={handleDrawerToggle}
        PaperProps={{
          sx: { 
            width: vw(300), 
            borderRadius: `${vmin(24)} 0 0 ${vmin(24)}`, 
            p: 4,
            bgcolor: isDark ? 'rgba(8,8,8,0.95)' : 'rgba(249,248,243,0.95)',
            backdropFilter: `blur(${vmin(16)})`,
            borderLeft: 1,
            borderColor: isDark ? 'rgba(197,160,89,0.15)' : 'rgba(0,0,0,0.08)',
          }
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
