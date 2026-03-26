'use client';

import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { alpha } from '@mui/material/styles';
import { UI } from '@/styles/theme';
import { useTranslation } from '@/lib/i18n/client';

export type SpaceTab = 'start' | 'map' | 'calendar' | 'profile';

interface SpaceBottomNavProps {
  value: SpaceTab;
  onTabChange: (tab: SpaceTab) => void;
  lang: string;
}

const TABS: { key: SpaceTab; icon: React.ReactNode }[] = [
  { key: 'start', icon: <HomeOutlinedIcon /> },
  { key: 'map', icon: <MapOutlinedIcon /> },
  { key: 'calendar', icon: <CalendarMonthOutlinedIcon /> },
  { key: 'profile', icon: <PersonOutlineIcon /> },
];

export default function SpaceBottomNav({ value, onTabChange, lang }: SpaceBottomNavProps) {
  const { t } = useTranslation(lang, 'space');

  return (
    <Box
      sx={{
        flexShrink: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTopLeftRadius: UI.radius.xl,
        borderTopRightRadius: UI.radius.xl,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: (theme) =>
          `0 -8px 32px -12px ${alpha(theme.palette.mode === 'dark' ? '#000' : '#a04100', 0.12)}`,
      }}
    >
      <BottomNavigation
        value={value}
        onChange={(_, newValue: SpaceTab) => onTabChange(newValue)}
        showLabels
        sx={{
          height: 'auto',
          pt: 0.75,
          pb: 'max(0.75rem, env(safe-area-inset-bottom))',
          px: 0.5,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            py: 0.75,
            gap: '0.125rem',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: 'primary.main',
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'primary.main',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.5625rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              mt: '0.125rem',
            },
          },
          /* QR center tab — accent style */
          '& .MuiBottomNavigationAction-root:nth-of-type(3)': {
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                bgcolor: 'primary.container',
                color: 'primary.contrastText',
                borderRadius: '50%',
                p: 0.75,
                boxShadow: (theme) =>
                  `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                transform: 'translateY(-0.25rem)',
                transition: 'all 0.25s ease',
              },
            },
            '& .MuiSvgIcon-root': {
              bgcolor: 'action.hover',
              borderRadius: '50%',
              p: 0.75,
              transition: 'all 0.25s ease',
            },
          },
        }}
      >
        {TABS.map(({ key, icon }) => (
          <BottomNavigationAction
            key={key}
            value={key}
            icon={icon}
            label={t(`tabs.${key}`)}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
