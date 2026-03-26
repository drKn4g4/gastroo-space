// src/app/[lang]/components/Footer.tsx
'use client';

import React from 'react';
import { Box, Container, Typography, Link as MuiLink, Stack, alpha, useTheme } from '@mui/material';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { UI } from '@/styles/theme';

export default function Footer() {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang, 'common');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const currentYear = new Date().getFullYear();

  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'transparent',
        borderTopStyle: 'solid',
        borderTopWidth: UI.borderWidth.hair,
        borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        py: UI.footer.py,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg" sx={{ px: UI.footer.containerPx }}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={UI.footer.stackSpacing} 
          justifyContent="space-between" 
          alignItems={{ xs: 'center', md: 'flex-start' }}
        >
          {/* Logo & Brand */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' }, maxWidth: { xs: '100%', md: UI.size.footerColMaxW }, mb: { xs: 2, md: 0 } }}>
            <Typography
              variant="h6"
              sx={{ 
                fontWeight: 900,
                fontSize: UI.footer.logoFontSize,
                letterSpacing: '-0.03em',
                mb: UI.footer.logoMb,
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'center', md: 'flex-start' },
                gap: 1,
                '& span': { color: 'primary.main' }
              }}
            >
              gastroo<span>.</span>space 🍴
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: UI.footer.subtitleLineHeight, fontSize: UI.footer.subtitleFontSize }}>
              {t('hero.subtitle')}
            </Typography>
          </Box>
          
          {/* Links */}
          <Stack direction="row" spacing={UI.footer.navSpacing} component="nav" aria-label="Footer navigation">
            <Box>
              <Typography variant="subtitle2" color="text.primary" sx={{ mb: UI.footer.sectionTitleMb, fontWeight: 700, letterSpacing: '-0.01em', fontSize: UI.footer.sectionTitleFontSize }}>
                {t('footer.product')}
              </Typography>
              <Stack component="ul" spacing={UI.footer.linkSpacing} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                <Box component="li">
                  <MuiLink href={`/${params.lang}/#offer`} color="text.secondary" sx={{ fontSize: UI.footer.linkFontSize, textDecoration: 'none', transition: 'all 0.2s ease', '&:hover': { color: 'primary.main', transform: `translateX(${UI.space.xs})` }, display: 'inline-block' }}>
                    {t('nav.offer')}
                  </MuiLink>
                </Box>
                <Box component="li">
                  <MuiLink href={`/${params.lang}/#demo`} color="text.secondary" sx={{ fontSize: UI.footer.linkFontSize, textDecoration: 'none', transition: 'all 0.2s ease', '&:hover': { color: 'primary.main', transform: `translateX(${UI.space.xs})` }, display: 'inline-block' }}>
                    {t('nav.demo')}
                  </MuiLink>
                </Box>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.primary" sx={{ mb: UI.footer.sectionTitleMb, fontWeight: 700, letterSpacing: '-0.01em', fontSize: UI.footer.sectionTitleFontSize }}>
                {t('footer.company')}
              </Typography>
              <Stack component="ul" spacing={UI.footer.linkSpacing} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                <Box component="li">
                  <MuiLink href="#" color="text.secondary" sx={{ fontSize: UI.footer.linkFontSize, textDecoration: 'none', transition: 'all 0.2s ease', '&:hover': { color: 'primary.main', transform: `translateX(${UI.space.xs})` }, display: 'inline-block' }}>
                    {t('footer.contact')}
                  </MuiLink>
                </Box>
                <Box component="li">
                  <MuiLink href="#" color="text.secondary" sx={{ fontSize: UI.footer.linkFontSize, textDecoration: 'none', transition: 'all 0.2s ease', '&:hover': { color: 'primary.main', transform: `translateX(${UI.space.xs})` }, display: 'inline-block' }}>
                    {t('footer.privacy')}
                  </MuiLink>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Stack>

        <Box sx={{ mt: UI.footer.copyrightMt, pt: UI.footer.copyrightPt, borderTopStyle: 'solid', borderTopWidth: UI.borderWidth.hair, borderTopColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500, fontSize: UI.footer.copyrightFontSize }}>
            © {currentYear} gastroo (/{params.lang}). {t('footer.all_rights_reserved')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
