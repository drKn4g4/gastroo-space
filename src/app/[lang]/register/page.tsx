// src/app/[lang]/register/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Button, TextField, Typography, Stack, Paper } from '@mui/material';
import { UI } from '@/styles/theme';
import { useTranslation } from '@/lib/i18n/client';

export default function RegisterPage() {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang || 'pl';
  const { t } = useTranslation(lang, 'auth');

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    referral: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors: typeof errors = { email: '', firstName: '', lastName: '', phone: '' };
    if (!form.email) newErrors.email = t('auth.register.errors.emailRequired');
    if (!form.firstName) newErrors.firstName = t('auth.register.errors.firstNameRequired');
    if (!form.lastName) newErrors.lastName = t('auth.register.errors.lastNameRequired');
    if (!form.phone) newErrors.phone = t('auth.register.errors.phoneRequired');
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // TODO: registration handler (e.g. save to Firestore)
    alert(t('auth.register.mockSuccess'));
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: UI.radius.lg, minWidth: { xs: '90vw', sm: 400 }, maxWidth: 480 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, textAlign: 'center', color: 'primary.main' }}>
          {t('auth.register.title')}
        </Typography>
        <form onSubmit={handleSubmit} autoComplete="off">
          <Stack spacing={3}>
            <TextField
              label={t('auth.register.emailLabel')}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
              autoComplete="email"
            />
            <TextField
              label={t('auth.register.firstNameLabel')}
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              error={!!errors.firstName}
              helperText={errors.firstName}
              fullWidth
              autoComplete="given-name"
            />
            <TextField
              label={t('auth.register.lastNameLabel')}
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              error={!!errors.lastName}
              helperText={errors.lastName}
              fullWidth
              autoComplete="family-name"
            />
            <TextField
              label={t('auth.register.phoneLabel')}
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              error={!!errors.phone}
              helperText={errors.phone}
              fullWidth
              autoComplete="tel"
            />
            <TextField
              label={t('auth.register.referralLabel')}
              name="referral"
              value={form.referral}
              onChange={handleChange}
              fullWidth
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              sx={{ fontWeight: 900, fontSize: '1.1rem', borderRadius: UI.radius.md, py: 1.5 }}
              fullWidth
            >
              {t('auth.buttons.register')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
