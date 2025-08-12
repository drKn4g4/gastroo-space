// src/app/[lang]/components/OfferSection.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { Box, Container, Typography, Card, CardHeader, CardContent, CardActions, Button, Theme } from '@mui/material';
import Grid from '@mui/material/Grid';

// Definiujemy tylko klucze naszych pakietów
const tierKeys = ['visibility', 'reservations', 'team', 'qr'];
const maxTierKey = 'max';

export default function OfferSection() {
  const params = useParams<{ lang: string }>();
  // Używamy "common" jako domyślnej przestrzeni nazw
  const { t } = useTranslation(params.lang); 

  return (
    <Container maxWidth="lg" component="section" sx={{ pt: 8, pb: 8 }} id="oferta">
      <Typography component="h2" variant="h3" align="center" color="text.primary" gutterBottom>
        {t('offer.title')}
      </Typography>
      <Grid container spacing={4} alignItems="flex-end" justifyContent="center">
        {/* Pakiety standardowe */}
        {tierKeys.map((key) => (
          // --- POPRAWIONY FRAGMENT PONIŻEJ ---
          <Grid key={key}>
            <Card>
              <CardHeader
                title={t(`offer.packages.${key}.name`)}
                titleTypographyProps={{ align: 'center' }}
                sx={{ bgcolor: (theme: Theme) => (theme.palette.mode === 'light' ? 'grey.200' : 'grey.700') }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 2 }}>
                  <Typography component="h2" variant="h4" color="text.primary">
                    {t(`offer.packages.${key}.price`).split(' ')[0]} 
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                     &nbsp;{t(`offer.packages.${key}.price`).split(' ')[1]}
                  </Typography>
                </Box>
                <Typography align="center">/{t('offer.price_per_month')}</Typography>
              </CardContent>
              <CardActions>
                <Button fullWidth variant="outlined">
                  {t('offer.cta_choose')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Wyróżniony Pakiet MAX */}
      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <Card sx={{ width: '100%', maxWidth: 360, border: 2, borderColor: 'primary.main' }}>
              <CardHeader
                title={t(`offer.packages.${maxTierKey}.name`)}
                subheader={t(`offer.packages.${maxTierKey}.subheader`)}
                titleTypographyProps={{ align: 'center', variant: 'h4' }}
                subheaderTypographyProps={{ align: 'center' }}
                sx={{ bgcolor: 'primary.main', color: 'common.white' }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 2 }}>
                   <Typography component="h2" variant="h3" color="text.primary">
                     {t(`offer.packages.${maxTierKey}.price`).split(' ')[0]}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                     &nbsp;{t(`offer.packages.${maxTierKey}.price`).split(' ')[1]}
                  </Typography>
                </Box>
                <Typography align="center">/{t('offer.price_per_month')}</Typography>
              </CardContent>
              <CardActions>
                <Button fullWidth variant="contained">
                  {t('offer.cta_choose')}
                </Button>
              </CardActions>
            </Card>
      </Box>

    </Container>
  );
}