'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
  Grid,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { db } from '@/lib/firebase/config';
import { GASTRO_TAGS } from '@/types/organization';
import type { GastroTag } from '@/types/organization';
import { vh, vmin } from '@/styles/units';
import { useTranslation } from '@/lib/i18n/client';

// ─── Popular tags shown as clickable chips ──────────────────────────────────

const POPULAR_TAGS: GastroTag[] = [
  'tapas', 'carbonara', 'sushi', 'burger', 'ramen',
  'pasta', 'vegan', 'steak', 'brunch', 'street_food',
  'craft_beer', 'specialty_coffee', 'low_carb', 'neapolitan_pizza',
  'pad_thai', 'curry', 'dim_sum', 'cocktail_bar',
];

const ALLERGEN_OPTIONS: { id: string; label: string }[] = [
  { id: 'a1', label: 'Gluten' },
  { id: 'a2', label: 'Skorupiaki / Crustaceans' },
  { id: 'a3', label: 'Jaja / Eggs' },
  { id: 'a4', label: 'Ryby / Fish' },
  { id: 'a5', label: 'Orzeszki ziemne / Peanuts' },
  { id: 'a6', label: 'Soja / Soybeans' },
  { id: 'a7', label: 'Mleko / Milk' },
  { id: 'a8', label: 'Orzechy / Tree nuts' },
  { id: 'a9', label: 'Seler / Celery' },
  { id: 'a10', label: 'Gorczyca / Mustard' },
  { id: 'a11', label: 'Sezam / Sesame' },
  { id: 'a12', label: 'Siarczyny / Sulfites' },
  { id: 'a13', label: 'Lubin / Lupin' },
  { id: 'a14', label: 'Mieczaki / Mollusks' },
];

/** Format gastro tag for display: neapolitan_pizza -> Neapolitan Pizza */
function formatTag(tag: string): string {
  return tag
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Generate a 12-digit numeric user code */
function generateUserCode(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
}

export default function OnboardingPage() {
  const params = useParams<{ lang: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const lang = params.lang;
  const { t } = useTranslation(lang, 'onboarding');

  const steps = [
    t('onboarding.steps.account'),
    t('onboarding.steps.preferences'),
    t('onboarding.steps.whoAreYou'),
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Step 0: Account info
  const nameParts = (user?.displayName || '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === 'password') ?? false;

  // Step 1: Foodie preferences
  const [selectedTags, setSelectedTags] = useState<GastroTag[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  // Step 2: Gastronaut flag
  const [isGastronaut, setIsGastronaut] = useState(false);

  const toggleTag = (tag: GastroTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Link password credential if provided (Google users adding email/password login)
      if (password && !hasPasswordProvider && user.email) {
        try {
          const credential = EmailAuthProvider.credential(user.email, password);
          await linkWithCredential(user, credential);
        } catch (err) {
          console.warn('Could not link password credential:', err);
        }
      }

      // Only generate userCode if the user doesn't already have one
      const userDocRef = doc(db, 'users', user.uid);
      const existingDoc = await getDoc(userDocRef);
      const existingCode = existingDoc.exists() ? existingDoc.data()?.userCode : null;
      const userCode = existingCode || generateUserCode();
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await setDoc(
        userDocRef,
        {
          userId: user.uid,
          email: user.email,
          name: displayName || user.displayName || '',
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          photoURL: user.photoURL || '',
          gastronaut: isGastronaut,
          userCode,
          qrVersion: 1,
          allergens: selectedAllergens.length > 0 ? selectedAllergens : null,
          gastroTags: selectedTags.length > 0 ? selectedTags : null,
          onboardingCompleted: true,
          organizations: [],
          viewMode: 'foodie',
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setDone(true);

      setTimeout(() => {
        router.push(`/${lang}/space`);
      }, 2000);
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : t('onboarding.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (done) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" color="primary.main" sx={{ fontWeight: 950, letterSpacing: '-0.05em' }}>
            {t('onboarding.done.title')}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700, mt: 2 }}>
            {isGastronaut
              ? t('onboarding.done.subtitleGastronaut')
              : t('onboarding.done.subtitleFoodie')}
          </Typography>
          <CircularProgress sx={{ mt: 6 }} size={40} thickness={5} color="primary" />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 8 }}>
      <Container maxWidth="md">
        <Box
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: vmin(28),
            bgcolor: isDark ? 'rgba(18,18,18,0.5)' : 'rgba(255,255,255,0.6)',
            backdropFilter: `blur(${vmin(24)})`,
            WebkitBackdropFilter: `blur(${vmin(24)})`,
            borderStyle: 'solid',
            borderWidth: vmin(1),
            borderColor: isDark ? 'rgba(197,160,89,0.2)' : 'rgba(0,0,0,0.08)',
            boxShadow: `0 ${vmin(32)} ${vmin(64)} calc(-1 * ${vmin(16)}) ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.12)'}`,
          }}
        >
          <Typography variant="h3" gutterBottom align="center" sx={{ fontWeight: 900, letterSpacing: '-0.04em' }}>
            Witaj w gastroo<span style={{ color: theme.palette.primary.main }}>.</span>space!
          </Typography>
          <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 6, fontWeight: 700, opacity: 0.9 }}>
            {t('onboarding.subtitle')}
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 8 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: 'primary.main' },
                      '&.Mui-completed': { color: 'primary.light' },
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 4, borderRadius: vmin(16), fontWeight: 700 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ minHeight: vh(320) }}>
            {/* STEP 1: Account info */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 900, mb: 3, letterSpacing: '-0.02em' }}>
                  {t('onboarding.step1.title')}
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label={t('onboarding.step1.firstName')}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      fullWidth
                      autoComplete="given-name"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label={t('onboarding.step1.lastName')}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      fullWidth
                      autoComplete="family-name"
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Email"
                      value={user.email || ''}
                      fullWidth
                      disabled
                      autoComplete="email"
                      helperText={t('onboarding.step1.emailImported')}
                      FormHelperTextProps={{ sx: { fontWeight: 600 } }}
                    />
                  </Grid>
                  {!hasPasswordProvider && (
                    <Grid size={12}>
                      <TextField
                        label={t('onboarding.step1.password')}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        autoComplete="new-password"
                        helperText={t('onboarding.step1.passwordHint')}
                        FormHelperTextProps={{ sx: { fontWeight: 600 } }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* STEP 2: Foodie preferences (tags + allergens) */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 900, mb: 1, letterSpacing: '-0.02em' }}>
                  {t('onboarding.step2.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('onboarding.step2.subtitle')}
                </Typography>

                {/* Popular tags as clickable chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {POPULAR_TAGS.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    return (
                      <Chip
                        key={tag}
                        label={formatTag(tag)}
                        onClick={() => toggleTag(tag)}
                        variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'primary' : 'default'}
                        sx={{
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Full autocomplete for all tags */}
                <Autocomplete
                  multiple
                  freeSolo={false}
                  options={[...GASTRO_TAGS].filter((t) => !POPULAR_TAGS.includes(t))}
                  getOptionLabel={formatTag}
                  value={selectedTags.filter((t) => !POPULAR_TAGS.includes(t))}
                  onChange={(_, newVal) => {
                    const popularSelected = selectedTags.filter((t) => POPULAR_TAGS.includes(t));
                    setSelectedTags([...popularSelected, ...(newVal as GastroTag[])]);
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((tag, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={formatTag(tag)}
                          size="small"
                          {...tagProps}
                          sx={{ fontWeight: 700 }}
                        />
                      );
                    })
                  }
                  renderInput={(inputProps) => (
                    <TextField
                      {...inputProps}
                      label={t('onboarding.step2.searchPlaceholder')}
                      placeholder={t('onboarding.step2.searchExample')}
                    />
                  )}
                  sx={{ mb: 4 }}
                />

                {/* Allergens */}
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
                  {t('onboarding.step2.allergens')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {ALLERGEN_OPTIONS.map((a) => {
                    const selected = selectedAllergens.includes(a.id);
                    return (
                      <Chip
                        key={a.id}
                        label={a.label}
                        onClick={() =>
                          setSelectedAllergens((prev) =>
                            selected ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                          )
                        }
                        variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'error' : 'default'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      />
                    );
                  })}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {t('onboarding.step2.allergensHint')}
                </Typography>
              </Box>
            )}

            {/* STEP 3: Foodie / Gastronaut choice */}
            {activeStep === 2 && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 900, mb: 2, letterSpacing: '-0.02em' }}>
                  {t('onboarding.step3.title')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, mt: 4, justifyContent: 'center' }}>
                  {/* Foodie card */}
                  <Box
                    onClick={() => setIsGastronaut(false)}
                    sx={{
                      flex: 1,
                      maxWidth: 340,
                      p: 4,
                      borderRadius: vmin(20),
                      cursor: 'pointer',
                      borderStyle: 'solid',
                      borderWidth: 2,
                      borderColor: !isGastronaut ? 'primary.main' : 'divider',
                      bgcolor: !isGastronaut
                        ? alpha(theme.palette.primary.main, 0.06)
                        : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
                      {t('onboarding.step3.foodie.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {t('onboarding.step3.foodie.description')}
                    </Typography>
                  </Box>

                  {/* Gastronaut card */}
                  <Box
                    onClick={() => setIsGastronaut(true)}
                    sx={{
                      flex: 1,
                      maxWidth: 340,
                      p: 4,
                      borderRadius: vmin(20),
                      cursor: 'pointer',
                      borderStyle: 'solid',
                      borderWidth: 2,
                      borderColor: isGastronaut ? 'primary.main' : 'divider',
                      bgcolor: isGastronaut
                        ? alpha(theme.palette.primary.main, 0.06)
                        : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
                      {t('onboarding.step3.gastronaut.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {t('onboarding.step3.gastronaut.description')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 10 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              size="large"
              sx={{ fontWeight: 800, borderRadius: vmin(14), px: 4 }}
            >
              {t('onboarding.buttons.back')}
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              size="large"
              sx={{
                borderRadius: vmin(16),
                px: 8,
                fontWeight: 900,
                fontSize: '1.1rem',
                boxShadow: `0 ${vmin(16)} ${vmin(32)} calc(-1 * ${vmin(8)}) ${alpha(theme.palette.primary.main, 0.45)}`,
              }}
            >
              {loading ? (
                <CircularProgress size={26} color="inherit" />
              ) : activeStep === steps.length - 1 ? (
                t('onboarding.buttons.save')
              ) : (
                t('onboarding.buttons.next')
              )}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
