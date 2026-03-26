'use client';

import React from 'react';
import { ThemeProvider, createTheme, alpha, type PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import NextAppDirEmotionCacheProvider from './EmotionCache';
import { APP_THEME_STORAGE_KEY, HIGH_CONTRAST_STORAGE_KEY, UI } from '@/styles/theme';

export { alpha };

type ThemeModeContextValue = {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
  isOverridden: boolean;
};

const ThemeModeContext = React.createContext<ThemeModeContextValue | null>(null);

export function useThemeMode() {
  const ctx = React.useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeRegistry');
  return ctx;
}

// ─── Design System: The Gastronomic Authority ────────────────────────────────
// Palette tokens derived from the spec's tonal depth system.

const PALETTE = {
  light: {
    primary:               '#a04100',
    primaryContainer:      '#ff6b00',
    onPrimary:             '#ffffff',
    secondary:             '#555f70',
    secondaryContainer:    '#dce2f0',
    onSecondaryContainer:  '#141b2b',
    secondaryFixedDim:     '#c4cad8',
    inverseSurface:        '#293040',
    onInverseSurface:      '#f1f3ff',
    surface:               '#f9f9ff',   // Level 0
    surfaceContainerLow:   '#f1f3ff',   // Level 1
    surfaceContainerLowest:'#ffffff',    // Level 2 (cards)
    surfaceContainerHigh:  '#e4e6f0',   // Inputs
    surfaceContainerHighest:'#dde0ec',   // Toggles
    surfaceDim:            '#d8dbe8',    // Admin bg
    surfaceBright:         '#fdfeff',
    onBackground:          '#141b2b',
    onSurface:             '#141b2b',
    outlineVariant:        'rgba(41,48,64,0.15)',
    error:                 '#ba1a1a',
    onError:               '#ffffff',
  },
  dark: {
    primary:               '#ff8a50',
    primaryContainer:      '#ff6b00',
    onPrimary:             '#ffffff',
    secondary:             '#b0b8c8',
    secondaryContainer:    '#3a4252',
    onSecondaryContainer:  '#e1e2ec',
    secondaryFixedDim:     '#4a5264',
    inverseSurface:        '#e1e2ec',
    onInverseSurface:      '#293040',
    surface:               '#111720',   // Level 0
    surfaceContainerLow:   '#191f2a',   // Level 1
    surfaceContainerLowest:'#0c1018',   // Level 2
    surfaceContainerHigh:  '#242a36',   // Inputs
    surfaceContainerHighest:'#2e3442',  // Toggles
    surfaceDim:            '#1e2430',   // Admin bg
    surfaceBright:         '#343a48',
    onBackground:          '#e1e2ec',
    onSurface:             '#e1e2ec',
    outlineVariant:        'rgba(225,226,236,0.12)',
    error:                 '#ffb4ab',
    onError:               '#690005',
  },
} as const;

// ─── Fonts ───────────────────────────────────────────────────────────────────

const DISPLAY_FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
const BODY_FONT    = "'Inter', system-ui, -apple-system, sans-serif";

// ─── Theme builders ──────────────────────────────────────────────────────────

function buildHighContrastTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      ...(isDark
        ? {
            primary: { main: '#B2FF59', contrastText: '#000000' },
            secondary: { main: '#00E5FF', contrastText: '#000000' },
            background: { default: '#000000', paper: '#000000' },
            text: { primary: '#FFFFFF', secondary: '#FFFFFF', disabled: 'rgba(255, 255, 255, 0.7)' },
            divider: '#FFFFFF',
          }
        : {
            primary: { main: '#002984', contrastText: '#FFFFFF' },
            secondary: { main: '#004D40', contrastText: '#FFFFFF' },
            background: { default: '#FFFFFF', paper: '#FFFFFF' },
            text: { primary: '#000000', secondary: '#000000', disabled: 'rgba(0, 0, 0, 0.7)' },
            divider: '#000000',
          }),
    },
    typography: {
      fontFamily: BODY_FONT,
      h1: { fontWeight: 950, fontFamily: DISPLAY_FONT },
      h2: { fontWeight: 950, fontFamily: DISPLAY_FONT },
      h3: { fontWeight: 900, fontFamily: DISPLAY_FONT },
      button: { fontWeight: 900, textTransform: 'uppercase' },
    },
    components: {
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ border: `1px solid ${theme.palette.divider}` }),
          head: ({ theme }) => ({
            backgroundColor: theme.palette.text.primary,
            color: theme.palette.background.default,
            fontWeight: 950,
          }),
        },
      },
      MuiButton: { styleOverrides: { root: { borderRadius: 0 } } },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            border: `2px solid ${theme.palette.text.primary}`,
            borderRadius: 0,
            boxShadow: 'none',
          }),
        },
      },
    },
  });
}

function buildTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const p = isDark ? PALETTE.dark : PALETTE.light;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: p.primary,
        light: p.primaryContainer,
        contrastText: p.onPrimary,
      },
      secondary: {
        main: p.secondary,
        light: p.secondaryContainer,
        contrastText: p.onSecondaryContainer,
      },
      background: {
        default: p.surface,
        paper: p.surfaceContainerLow,
      },
      text: {
        primary: p.onBackground,
        secondary: p.secondary,
        disabled: alpha(p.onBackground, 0.38),
      },
      error: {
        main: p.error,
        contrastText: p.onError,
      },
      divider: p.outlineVariant,
      action: {
        hover: alpha(p.onSurface, 0.04),
        selected: alpha(p.onSurface, 0.08),
        disabledBackground: p.surfaceDim,
        focus: alpha(p.onSurface, 0.12),
      },
    } as any,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: BODY_FONT,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      // Display — Plus Jakarta Sans
      h1: { fontFamily: DISPLAY_FONT, fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 },
      h2: { fontFamily: DISPLAY_FONT, fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 },
      // Headline — Plus Jakarta Sans
      h3: { fontFamily: DISPLAY_FONT, fontSize: 'clamp(1.2rem, 2.5vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h4: { fontFamily: DISPLAY_FONT, fontSize: 'clamp(1rem, 2vw, 1.375rem)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 },
      // Title — Inter
      h5: { fontFamily: BODY_FONT, fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 },
      h6: { fontFamily: BODY_FONT, fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
      // Body — Inter
      body1: { fontFamily: BODY_FONT, fontSize: '0.875rem', lineHeight: 1.6 },
      body2: { fontFamily: BODY_FONT, fontSize: '0.8125rem', lineHeight: 1.5 },
      // Label — Inter
      caption: { fontFamily: BODY_FONT, fontSize: '0.75rem', lineHeight: 1.4 },
      overline: { fontFamily: BODY_FONT, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, lineHeight: 1.4 },
      button: { fontFamily: BODY_FONT, fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.01em', textTransform: 'none' as const },
    },
    // Abandon traditional shadows — use tonal layering
    shadows: [
      'none',
      // Level 1: ambient only for floating elements
      `0 8px 24px -4px ${alpha(p.onSurface, 0.08)}`,
      ...Array(22).fill(`0 8px 24px -4px ${alpha(p.onSurface, 0.08)}`),
    ] as any,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { colorScheme: mode },
        },
      },

      // ─── Buttons: flat primary, flat secondary ─────────────────────
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none' as const,
            fontWeight: 700,
            padding: '8px 18px',
          },
          text: {
            color: p.onBackground,
            '&:hover': { backgroundColor: alpha(p.onSurface, 0.04) },
          },
          outlined: {
            color: p.onBackground,
            borderColor: p.outlineVariant,
            '&:hover': { borderColor: alpha(p.onSurface, 0.24), backgroundColor: alpha(p.onSurface, 0.04) },
          },
          contained: {
            backgroundColor: p.primary,
            color: p.onPrimary,
            border: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: p.primaryContainer,
              boxShadow: 'none',
            },
          },
        },
      },

      // ─── Typography defaults ─────────────────────────────────────────
      MuiTypography: {
        styleOverrides: {
          root: { color: p.onBackground },
        },
      },

      // ─── Links ───────────────────────────────────────────────────────
      MuiLink: {
        styleOverrides: {
          root: {
            color: p.primary,
            textDecorationColor: alpha(p.primary, 0.35),
            '&:hover': { color: p.primaryContainer },
          },
        },
      },

      // ─── Icon buttons: ghost style ───────────────────────────────────
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: p.onBackground,
            border: 'none',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: alpha(p.onSurface, 0.06),
            },
          },
        },
      },

      // ─── SVG icons ───────────────────────────────────────────────────
      MuiSvgIcon: {
        styleOverrides: {
          root: { color: 'inherit', fill: 'currentColor' },
        },
      },

      // ─── Paper: tonal layering, rounded ────────────────────────────
      MuiPaper: {
        styleOverrides: {
          root: {
            color: p.onBackground,
            backgroundImage: 'none',
            border: 'none',
            borderRadius: 16,
            boxShadow: 'none',
          },
        },
      },

      // ─── Cards: Level 2 — subtle shadow + rounded ────────────────
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: p.surfaceContainerLowest,
            color: p.onBackground,
            border: 'none',
            borderRadius: 16,
            boxShadow: `0 1px 3px 0 ${alpha(p.onSurface, 0.04)}, 0 1px 2px -1px ${alpha(p.onSurface, 0.03)}`,
          },
        },
      },

      // ─── AppBar: glassmorphism ──────────────────────────────────────
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(p.surfaceContainerLow, 0.7),
            color: p.onBackground,
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
        },
      },

      // ─── Drawer: Level 1 surface ────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: p.surfaceContainerLow,
            color: p.onBackground,
            border: 'none',
          },
        },
      },

      // ─── List items ─────────────────────────────────────────────────
      MuiListItemIcon: {
        styleOverrides: {
          root: { color: p.secondary, minWidth: 32 },
        },
      },

      // ─── Inputs: filled style, surface_container_high ───────────────
      MuiInputBase: {
        styleOverrides: {
          root: {
            color: p.onBackground,
            backgroundColor: p.surfaceContainerHigh,
            '& input::placeholder, & textarea::placeholder': {
              color: alpha(p.onBackground, 0.52),
              opacity: 1,
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(p.primary, 0.2),
              borderWidth: 2,
            },
            '&.Mui-focused': {
              backgroundColor: p.surfaceContainerLowest,
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: alpha(p.onBackground, 0.62),
            '&.Mui-focused': { color: p.primary },
          },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: { color: alpha(p.onBackground, 0.58) },
        },
      },

      // ─── Chips: filter chips per spec ───────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            color: p.onBackground,
            backgroundColor: p.secondaryFixedDim,
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            '&.MuiChip-colorPrimary': {
              backgroundColor: p.primary,
              color: p.onPrimary,
            },
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: { color: p.onBackground },
        },
      },

      // ─── Tabs: no bottom border ─────────────────────────────────────
      MuiTab: {
        styleOverrides: {
          root: {
            color: alpha(p.onBackground, 0.58),
            '&.Mui-selected': { color: p.primary },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          root: { borderBottom: 'none' },
          indicator: { backgroundColor: p.primary, height: 3 },
        },
      },

      // ─── Tooltips: glassmorphism ────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: alpha(p.inverseSurface, 0.92),
            color: p.onInverseSurface,
            padding: '6px 12px',
            backdropFilter: 'blur(12px)',
            border: 'none',
          },
        },
      },

      // ─── Menus: floating, ambient shadow ────────────────────────────
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: p.surfaceContainerLowest,
            backgroundImage: 'none',
            border: 'none',
            boxShadow: `0 8px 24px -4px ${alpha(p.onSurface, 0.08)}`,
          },
        },
      },

      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(p.surfaceContainerLow, 0.7),
            border: 'none',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
        },
      },

      MuiSlider: {
        styleOverrides: {
          thumb: { boxShadow: 'none' },
        },
      },

      // ─── Divider: ghost border only ─────────────────────────────────
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: p.outlineVariant,
          },
        },
      },
    },
  });
}

// ─── Provider ────────────────────────────────────────────────────────────────

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mounted, setMounted] = React.useState(false);
  const [highContrast, setHighContrast] = React.useState(false);
  const [modeOverride, setModeOverride] = React.useState<PaletteMode | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const hc = localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true';
    if (hc) setHighContrast(true);

    const stored = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setModeOverride(stored);
    }
  }, []);

  const mode: PaletteMode = modeOverride ?? (mounted && prefersDark ? 'dark' : 'light');

  const theme = React.useMemo(() => {
    return highContrast ? buildHighContrastTheme(mode) : buildTheme(mode);
  }, [mode, highContrast]);

  const setMode = React.useCallback((next: PaletteMode) => {
    setModeOverride(next);
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleMode = React.useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeModeContext.Provider value={{ mode, setMode, toggleMode, isOverridden: modeOverride !== null }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ visibility: mounted ? 'visible' : 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </Box>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </NextAppDirEmotionCacheProvider>
  );
}
