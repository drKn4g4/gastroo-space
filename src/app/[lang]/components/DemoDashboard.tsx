// src/app/[lang]/components/DemoDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, Switch, Divider } from '@mui/material';

const individualPackageKeys = ['visibility', 'reservations', 'team', 'qr'];
const maxPackageKey = 'max';

export default function DemoDashboard() {
  const params = useParams<{ lang: string }>();
  const { t } = useTranslation(params.lang);

  const [selections, setSelections] = useState({
    visibility: false,
    reservations: false,
    team: false,
    qr: false,
    max: false,
  });

  // Ten efekt synchronizuje stan pakietu MAX z indywidualnymi pakietami
  useEffect(() => {
    const allIndividualSelected = individualPackageKeys.every(key => selections[key as keyof typeof selections]);
    // Jeśli stan "max" jest inny niż powinien, zaktualizuj go
    if (selections.max !== allIndividualSelected) {
      setSelections(prev => ({ ...prev, max: allIndividualSelected }));
    }
  }, [selections.visibility, selections.reservations, selections.team, selections.qr]);


  const handleToggle = (key: string) => {
    const newSelections = { ...selections };
    const currentSelection = newSelections[key as keyof typeof newSelections];

    if (key === maxPackageKey) {
      // Logika dla przełącznika MAX
      const newMaxState = !currentSelection;
      newSelections.max = newMaxState;
      individualPackageKeys.forEach(pkgKey => {
        newSelections[pkgKey as keyof typeof newSelections] = newMaxState;
      });
    } else {
      // Logika dla indywidualnych przełączników
      newSelections[key as keyof typeof newSelections] = !currentSelection;
    }

    setSelections(newSelections);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Interaktywne Demo Pakietów
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Wybierz moduły, które Cię interesują. Zaznaczenie wszystkich czterech automatycznie aktywuje pakiet MAX!
        </Typography>
        <List>
          {individualPackageKeys.map((key) => (
            <ListItem key={key}>
              <ListItemText
                primary={t(`offer.packages.${key}.name`)}
                secondary={t(`offer.packages.${key}.description`)}
              />
              <Switch
                checked={selections[key as keyof typeof selections]}
                onChange={() => handleToggle(key)}
              />
            </ListItem>
          ))}
          <Divider sx={{ my: 2 }} />
          <ListItem sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
            <ListItemText
              primary={t(`offer.packages.${maxPackageKey}.name`)}
              secondary={t(`offer.packages.${maxPackageKey}.description`)}
              primaryTypographyProps={{ variant: 'h6' }}
            />
            <Switch
              checked={selections.max}
              onChange={() => handleToggle(maxPackageKey)}
              color="primary"
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
}