'use client';

import React from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import BackspaceIcon from '@mui/icons-material/Backspace';
import { alpha, useTheme } from '@mui/material/styles';
import T from '@/styles/pos.tokens';
import { vmin } from '@/styles/units';
import { TEST_IDS } from '@/lib/testing/selectors';

const NUMPAD_KEYS = ['1','2','3','4','5','6','7','8','9','back','0','ok'] as const;
type NumpadKey = typeof NUMPAD_KEYS[number];

export interface PINpadProps {
  pin: string;
  pinLength?: number;
  status: 'idle' | 'loading' | 'error' | 'success';
  errorMsg?: string;
  onKey: (key: NumpadKey | string) => void;
}

export default function PINpad({ pin, pinLength = 4, status, errorMsg, onKey }: PINpadProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dots = Array.from({ length: pinLength }, (_, i) => i < pin.length);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3vh' }}>
      <Box sx={{ height: T.pinIndicatorH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'error' ? (
          <Typography sx={{ color: 'error.main', fontWeight: 900, fontSize: '1.1rem' }}>{errorMsg}</Typography>
        ) : status === 'loading' ? (
          <CircularProgress size={32} thickness={5} color="primary" />
        ) : (
          <Stack direction="row" spacing={pinLength >= 6 ? 2 : 3} alignItems="center">
            {dots.map((filled, i) => (
              <Box
                key={i}
                sx={{
                  width: T.pinDot,
                  height: T.pinDot,
                  borderRadius: '50%',
                  borderStyle: 'solid',
                  borderWidth: vmin(2),
                  borderColor: filled ? 'primary.main' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  bgcolor: filled ? 'primary.main' : 'transparent',
                  transform: filled ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: filled ? `0 0 ${vmin(15)} ${alpha(theme.palette.primary.main, 0.5)}` : 'none',
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5vw',
        '@media (min-width: 37.5rem)': { gap: '1vw' }
      }}>
        {NUMPAD_KEYS.map((key) => {
          const isOk = key === 'ok';
          const isBack = key === 'back';
          return (
            <Box
              key={key}
              data-testid={TEST_IDS.pinpad.key(key)}
              onClick={() => onKey(key)}
              sx={{
                width: T.pinButton,
                height: T.pinButton,
                '@media (max-height: 37.5rem)': { width: T.pinButtonLandscape, height: T.pinButtonLandscape },
                borderRadius: '24%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                bgcolor: isOk ? 'primary.main' : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                color: isOk ? (isDark ? '#1C150A' : '#FFF') : 'text.primary',
                borderStyle: 'solid',
                borderWidth: vmin(1),
                borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(197,160,89,0.15)' : 'rgba(0,0,0,0.06)',
                boxShadow: (t) => t.palette.mode === 'dark'
                  ? `0 ${vmin(8)} ${vmin(20)} rgba(0,0,0,0.4), inset 0 ${vmin(1)} ${vmin(1)} rgba(255,255,255,0.02)`
                  : `0 ${vmin(8)} ${vmin(20)} rgba(0,0,0,0.04), inset 0 ${vmin(1)} ${vmin(1)} rgba(255,255,255,0.8)`,
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:active': { transform: 'scale(0.9)', boxShadow: 'none' },
                '&:hover': {
                  bgcolor: isOk ? 'primary.dark' : alpha(theme.palette.primary.main, 0.1),
                  borderColor: 'primary.main',
                  color: isOk ? undefined : 'primary.main'
                },
              }}
            >
              {isBack ? <BackspaceIcon sx={{ fontSize: T.backspaceIcon }} /> :
                isOk ? <Typography sx={{ fontWeight: 950, fontSize: T.pinOkFont }}>OK</Typography> :
                <Typography sx={{ fontWeight: 800, fontSize: T.pinDigitFont }}>{key}</Typography>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
