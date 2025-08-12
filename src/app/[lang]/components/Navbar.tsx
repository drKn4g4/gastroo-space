// src/app/[lang]/components/Navbar.tsx
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemText,
  useTheme, useMediaQuery, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { useAuth } from '../providers/AuthProvider';
import { getAuth, signOut } from 'firebase/auth';
import app from '@/lib/firebase/config';

// Definiujemy linki dla różnych stanów logowania
const loggedOutNavItems = [
  { key: 'offer', href: `/offer` },
  { key: 'demo', href: `/demo` },
];

const loggedInNavItems = [
  { key: 'dashboard', href: `/dashboard` },
];

export default function Navbar() {
  const { user } = useAuth();
  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const { t } = useTranslation(params.lang, 'common');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // --- NOWA LOGIKA ---
  // Ustawiamy docelowy link dla logo w zależności od tego, czy użytkownik jest zalogowany
  const logoHref = user ? '/dashboard' : '/';
  // --------------------

  const handleLogout = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    router.push(`/${params.lang}`);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    // ... zawartość drawera bez zmian
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Menu
      </Typography>
      <Divider />
      <List>
        {user ? (
          <>
            {loggedInNavItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton component={Link} href={item.href}>
                  <ListItemText primary={t(`nav.${item.key}`)} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary={t('nav.logout')} />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <>
            {loggedOutNavItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton component={Link} href={item.href}>
                  <ListItemText primary={t(`nav.${item.key}`)} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login">
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
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            href={logoHref} // <-- UŻYCIE DYNAMICZNEGO LINKU
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
          >
            gastroo.space 🚀
          </Typography>

          {isMobile ? (
            <IconButton color="inherit" onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          ) : (
            <Box>
              {user ? (
                <>
                  {loggedInNavItems.map((item) => (
                    <Button key={item.key} color="inherit" component={Link} href={item.href}>
                      {t(`nav.${item.key}`)}
                    </Button>
                  ))}
                  <Button variant="outlined" onClick={handleLogout}>
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  {loggedOutNavItems.map((item) => (
                    <Button key={item.key} color="inherit" component={Link} href={item.href}>
                      {t(`nav.${item.key}`)}
                    </Button>
                  ))}
                  <Button variant="outlined" component={Link} href="/login">
                    {t('nav.login')}
                  </Button>
                </>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerToggle}>
        {drawer}
      </Drawer>
    </>
  );
}