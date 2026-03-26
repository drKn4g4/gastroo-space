// src/app/[lang]/components/OfferSection.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { Box, Container, Typography, Card, CardHeader, CardContent, CardActions, Button, Theme, alpha, useTheme } from '@mui/material';
import Grid from '@mui/material/Grid';
import { UI } from '@/styles/theme';
import { vmin } from '@/styles/units';


// Definiujemy tylko klucze naszych pakietów
const tierKeys = ['visibility', 'reservations', 'team', 'qr'];
const maxTierKey = 'max';

export default function OfferSection() {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang, 'offer');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 8, md: 15 } }} id="offer" aria-labelledby="offer-heading">
      <Typography 
        id="offer-heading" 
        component="h2" 
        variant="h1" 
        align="center" 
        color="text.primary" 
        gutterBottom 
        sx={{ 
          fontWeight: 900, 
          mb: 8, 
          fontSize: { xs: '2.5rem', md: '3.5rem' },
          letterSpacing: '-0.04em'
        }}
      >
        {t('offer.title')}
      </Typography>
      
      <Grid container spacing={4} alignItems="stretch" justifyContent="center" role="list">
        {tierKeys.map((key) => (
          <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }} role="listitem">
            <Card 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                width: '100%',
                bgcolor: isDark ? 'rgba(18,18,18,0.4)' : 'rgba(255,255,255,0.6)',
                borderStyle: 'solid',
                borderWidth: UI.borderWidth.hair,
                borderColor: isDark ? 'rgba(197,160,89,0.1)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <CardHeader
                title={t(`offer.packages.${key}.name`)}
                titleTypographyProps={{ align: 'center', variant: 'subtitle1', fontWeight: 900, letterSpacing: '0.05em', sx: { textTransform: 'uppercase' } }}
                sx={{ 
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderBottomStyle: 'solid',
                  borderBottomWidth: UI.borderWidth.hair,
                  borderBottomColor: isDark ? 'rgba(197,160,89,0.1)' : 'rgba(0,0,0,0.06)',
                  py: 2
                }}
              />
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 1 }}>
                  <Typography component="h3" variant="h3" color="primary.main" fontWeight={900} sx={{ letterSpacing: '-0.04em' }}>
                    {t(`offer.packages.${key}.price`).split(' ')[0]}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
                    &nbsp;{t(`offer.packages.${key}.price`).split(' ')[1]}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" align="center" sx={{ mb: 3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  {t('offer.price_per_month')}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6, fontWeight: 500 }}>
                  {t(`offer.packages.${key}.description`)}
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: UI.radius.md, 
                    fontWeight: 800,
                    borderColor: isDark ? 'rgba(197,160,89,0.3)' : 'rgba(0,0,0,0.12)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    }
                  }}
                  aria-label={`${t('offer.cta_choose')} ${t(`offer.packages.${key}.name`)}`}
                >
                  {t('offer.cta_choose')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Featured MAX Tier */}
      <Box sx={{ mt: 10, display: 'flex', justifyContent: 'center' }} role="presentation">
        <Card 
          sx={{ 
            width: '100%', 
            maxWidth: UI.size.offerMaxCardW, 
            position: 'relative',
            overflow: 'visible',
            borderRadius: UI.radius.xl,
            borderStyle: 'solid',
            borderWidth: UI.borderWidth.thick,
            borderColor: '#C5A059',
            background: isDark 
              ? `linear-gradient(135deg, rgba(8,8,8,0.9) 0%, rgba(197,160,89,0.05) 100%)`
              : `linear-gradient(135deg, #F9F8F3 0%, rgba(166,124,55,0.05) 100%)`,
            boxShadow: `0 ${vmin(32)} ${vmin(64)} calc(-1 * ${vmin(16)}) ${alpha(theme.palette.primary.main, 0.25)}`,
          }}
        >
          <CardHeader
            title={t(`offer.packages.${maxTierKey}.name`)}
            subheader={t(`offer.packages.${maxTierKey}.subheader`)}
            titleTypographyProps={{ align: 'center', variant: 'h2', fontWeight: 900, letterSpacing: '-0.04em' }}
            subheaderTypographyProps={{ align: 'center', variant: 'subtitle2', sx: { mt: 0.5, fontWeight: 800, opacity: 0.9, letterSpacing: '0.05em', textTransform: 'uppercase' } }}
            sx={{ 
              background: isDark 
                ? 'linear-gradient(135deg, #C5A059 0%, #8B652E 100%)'
                : 'linear-gradient(135deg, #A67C37 0%, #634426 100%)', 
              color: isDark ? '#1C150A' : '#FFFFFF',
              borderRadius: `${vmin(25)} ${vmin(25)} 0 0`,
              py: 5
            }}
          />
          <CardContent sx={{ pt: 6, pb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 1 }}>
              <Typography component="h3" variant="h1" color="primary.main" fontWeight={900} sx={{ letterSpacing: '-0.06em' }}>
                {t(`offer.packages.${maxTierKey}.price`).split(' ')[0]}
              </Typography>
              <Typography variant="h3" color="text.secondary" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                &nbsp;{t(`offer.packages.${maxTierKey}.price`).split(' ')[1]}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" align="center" sx={{ mb: 4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              {t('offer.price_per_month')}
            </Typography>
            <Typography variant="h6" align="center" color="text.primary" sx={{ mb: 2, fontWeight: 800, letterSpacing: '-0.02em', maxWidth: '80%' }}>
              {t(`offer.packages.${maxTierKey}.description`)}
            </Typography>
          </CardContent>
          <CardActions sx={{ p: 4, pt: 0 }}>
            <Button 
              fullWidth 
              variant="contained" 
              size="large"
              aria-label={`${t('offer.cta_choose')} ${t(`offer.packages.${maxTierKey}.name`)}`}
              sx={{ 
                borderRadius: UI.radius.lg, 
                py: 2.5, 
                fontSize: '1.2rem',
                fontWeight: 900,
                boxShadow: `0 ${vmin(16)} ${vmin(32)} calc(-1 * ${vmin(8)}) ${alpha(theme.palette.primary.main, 0.5)}`,
              }}
            >
              {t('offer.cta_choose')}
            </Button>
          </CardActions>
        </Card>
      </Box>
    </Container>
  );
}
