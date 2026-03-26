'use client';

import { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VerifiedIcon from '@mui/icons-material/Verified';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import ShareIcon from '@mui/icons-material/Share';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from '@/lib/i18n/client';

function normalizeUid(uid: string): string {
  const prepared = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (prepared.length >= 14) {
    return prepared.slice(0, 14);
  }
  return `${prepared}${'X'.repeat(14 - prepared.length)}`;
}

function formatUserCode(uid: string): string {
  const normalized = normalizeUid(uid);
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 9)}-${normalized.slice(9, 14)}`;
}

export default function UserQrView({ uid, userCode: profileUserCode, lang }: { uid: string; userCode?: string; lang: string }) {
  const { t } = useTranslation(lang, 'dashboard');
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const userCode = profileUserCode || formatUserCode(uid);
  const qrPayload = useMemo(() => `gastroo:user:${uid}:code:${userCode}`, [uid, userCode]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const onShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'gastroo.space',
          text: `${t('dashboard.qr.share_text', { defaultValue: 'Mój kod lojalnościowy' })}: ${userCode}`,
        });
      } catch { /* user cancelled */ }
    }
  };

  const isPrimary = theme.palette.primary.main;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        px: 3,
        pt: 4,
        pb: 14,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '22rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>

        {/* ── Header ── */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}
          >
            {t('dashboard.qr.title', { defaultValue: 'Twój kod QR' })}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: '0.625rem',
            }}
          >
            {t('dashboard.qr.loyalty_card', { defaultValue: 'Twoja Karta Lojalnościowa' })}
          </Typography>
        </Box>

        {/* ── QR Code Container ── */}
        <Box sx={{ position: 'relative', width: '100%', maxWidth: '18rem' }}>
          {/* Glow */}
          <Box
            sx={{
              position: 'absolute',
              inset: '-1rem',
              borderRadius: '2.5rem',
              bgcolor: alpha(isPrimary, 0.06),
              filter: 'blur(24px)',
              transition: 'background-color 0.5s',
              pointerEvents: 'none',
            }}
          />

          {/* Card */}
          <Box
            sx={{
              position: 'relative',
              bgcolor: 'background.paper',
              p: 3,
              borderRadius: '2rem',
              boxShadow: `0 20px 50px ${alpha(isPrimary, 0.1)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Gradient border frame */}
            <Box
              sx={{
                background: `linear-gradient(135deg, ${isPrimary} 0%, ${theme.palette.primary.dark ?? isPrimary} 100%)`,
                p: '3px',
                borderRadius: '0.75rem',
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: 'calc(0.75rem - 3px)',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                }}
              >
                <QRCodeCanvas
                  value={qrPayload}
                  size={256}
                  level="H"
                  imageSettings={{
                    src: '/icons/icon-512x512.png',
                    height: 80,
                    width: 80,
                    excavate: true,
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── User Code ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%' }}>
          <Tooltip title={copied ? t('dashboard.qr.copied', { defaultValue: 'Skopiowano' }) : t('dashboard.qr.copy', { defaultValue: 'Kopiuj kod' })}>
            <Button
              variant="text"
              onClick={onCopy}
              endIcon={<ContentCopyIcon sx={{ fontSize: '0.875rem !important', opacity: 0.5 }} />}
              sx={{
                bgcolor: (th) => alpha(th.palette.action.hover, 0.04),
                px: 3,
                py: 1,
                borderRadius: '1rem',
                fontFamily: 'monospace',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: (th) => alpha(th.palette.action.hover, 0.08),
                },
              }}
            >
              {userCode}
            </Button>
          </Tooltip>

          {/* Instructions */}
          <Stack spacing={1} alignItems="center" sx={{ maxWidth: '17rem' }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon sx={{ fontSize: '1rem' }} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.5625rem' }}
              >
                {t('dashboard.qr.instructions_label', { defaultValue: 'Instrukcja' })}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', fontWeight: 500, lineHeight: 1.6 }}
            >
              {t('dashboard.qr.subtitle', {
                defaultValue: 'Pokaż ten kod przy zamówieniu, żeby zbierać punkty lojalnościowe.',
              })}
            </Typography>
          </Stack>
        </Box>

        {/* ── Action Buttons ── */}
        <Stack direction="row" spacing={2} sx={{ width: '100%', mt: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AddToHomeScreenIcon />}
            sx={{
              borderRadius: '1.5rem',
              py: 2,
              flexDirection: 'column',
              gap: 0.5,
              fontWeight: 800,
              fontSize: '0.5625rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            {t('dashboard.qr.add_wallet', { defaultValue: 'Dodaj do portfela' })}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ShareIcon />}
            onClick={onShare}
            sx={{
              borderRadius: '1.5rem',
              py: 2,
              flexDirection: 'column',
              gap: 0.5,
              fontWeight: 800,
              fontSize: '0.5625rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            {t('dashboard.qr.share', { defaultValue: 'Udostępnij kod' })}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
