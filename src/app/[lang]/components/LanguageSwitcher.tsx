'use client';

import React from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { 
  Box, IconButton, Menu, MenuItem, Tooltip, 
  ListItemIcon, ListItemText, Typography 
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { activeLanguages } from '@/lib/i18n/settings';
import { UI } from '@/styles/theme';
import { vmin } from '@/styles/units';

// Map of language codes to their full names and flags/labels
const LANGUAGE_LABELS: Record<string, { name: string; flag: string }> = {
  pl: { name: 'Polski', flag: '🇵🇱' },
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Português', flag: '🇵🇹' },
  nl: { name: 'Nederlands', flag: '🇳🇱' },
  cs: { name: 'Čeština', flag: '🇨🇿' },
  sk: { name: 'Slovenčina', flag: '🇸🇰' },
  hu: { name: 'Magyar', flag: '🇭🇺' },
  ro: { name: 'Română', flag: '🇷🇴' },
  bg: { name: 'Българski', flag: '🇧🇬' },
  hr: { name: 'Hrvatski', flag: '🇭🇷' },
  sl: { name: 'Slovenščina', flag: '🇸🇮' },
  et: { name: 'Eesti', flag: '🇪🇪' },
  lv: { name: 'Latviešu', flag: '🇱🇻' },
  lt: { name: 'Lietuvių', flag: '🇱🇹' },
  el: { name: 'Ελληνικά', flag: '🇬🇷' },
  da: { name: 'Dansk', flag: '🇩🇰' },
  fi: { name: 'Suomi', flag: '🇫🇮' },
  sv: { name: 'Svenska', flag: '🇸🇪' },
  no: { name: 'Norsk', flag: '🇳🇴' },
  is: { name: 'Íslenska', flag: '🇮🇸' },
  ga: { name: 'Gaeilge', flag: '🇮🇪' },
  mt: { name: 'Malti', flag: '🇲🇹' },
  uk: { name: 'Українська', flag: '🇺🇦' },
};

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ lang: string }>();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  const currentLang = params.lang || 'pl';
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (newLang: string) => {
    if (newLang === currentLang) {
      handleClose();
      return;
    }

    // Replace the current locale in the path with the new one
    const segments = pathname.split('/');
    segments[1] = newLang; // pathname starts with / so segments[0] is empty
    const newPath = segments.join('/');
    
    router.push(newPath);
    handleClose();
  };

  return (
    <Box>
      <Tooltip title="Zmień język / Change language">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ 
            ml: 1,
            borderRadius: UI.radius.md,
            bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            '&:hover': { bgcolor: 'primary.main', color: 'white' },
            transition: 'all 0.2s'
          }}
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <LanguageIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        id="language-menu"
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 4,
          sx: {
            overflow: 'visible',
            filter: `drop-shadow(0 ${UI.space.xxs} ${UI.space.sm} rgba(0,0,0,0.32))`,
            mt: 1.5,
            maxHeight: UI.size.langMenuMaxH, // Approximately 5 items (5 * ~44 + padding)
            borderRadius: UI.radius.lg,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: vmin(14),
              width: vmin(10),
              height: vmin(10),
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
            '& .MuiList-root': {
              maxHeight: UI.size.langMenuMaxH,
              overflowY: 'auto',
              padding: `${UI.space.sm} 0`,
            }
          },
        }}
      >
        {activeLanguages.map((lang) => {
          const label = LANGUAGE_LABELS[lang] || { name: lang, flag: '🌐' };
          return (
            <MenuItem 
              key={lang} 
              onClick={() => handleLanguageChange(lang)}
              selected={currentLang === lang}
              sx={{ py: 0.75, px: 2, borderRadius: UI.radius.sm, mx: 1, my: 0.25 }}
            >
              <ListItemIcon sx={{ fontSize: '1.2rem', minWidth: `${vmin(32)} !important` }}>
                {label.flag}
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" sx={{ fontWeight: currentLang === lang ? 700 : 400 }}>
                  {label.name}
                </Typography>
              </ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
