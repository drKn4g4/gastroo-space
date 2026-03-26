'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../providers/AuthProvider';
import { auth, db } from '@/lib/firebase/config';
import { ROLE_PERMISSIONS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { UI } from '@/styles/theme';
import { vw } from '@/styles/units';
import { TEST_IDS } from '@/lib/testing/selectors';

const APP_VERSION = '0.1.0';
const HAS_LOGGED_IN_KEY = 'gastroo_has_logged_in';
const DEMO_ORG_ID = 'demo-org';
const DEMO_RESTAURANT_ID = 'demo-bistro';

const DEMO_ROLE_BY_EMAIL: Record<string, keyof typeof ROLE_PERMISSIONS> = {
  'admin@gastroo.dev': 'admin',
  'manager@gastroo.dev': 'manager',
  'kelner@gastroo.dev': 'waiter',
  'kucharz@gastroo.dev': 'chef',
  'supervisor@gastroo.dev': 'supervisor',
  'barman@gastroo.dev': 'bartender',
};
const IS_EMULATOR_MODE = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

type View = 'login' | 'register' | 'forgot';

async function syncUserProfile(
  firebaseUser: FirebaseUser,
  extra: Record<string, unknown> = {},
  options: { createOrganizationsIfMissing?: boolean } = {}
) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const existing = snapshot.data() ?? {};
  const name = firebaseUser.displayName ?? (typeof existing.name === 'string' ? existing.name : undefined);
  const photoURL = firebaseUser.photoURL ?? (typeof existing.photoURL === 'string' ? existing.photoURL : undefined);

  const payload: Record<string, unknown> = {
    userId: firebaseUser.uid,
    email: firebaseUser.email ?? existing.email ?? '',
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  };

  if (name) payload.name = name;
  if (photoURL) payload.photoURL = photoURL;
  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
    if (options.createOrganizationsIfMissing) payload.organizations = [];
  }

  await setDoc(userRef, payload, { merge: true });
}

async function ensureDemoB2BMembership(firebaseUser: FirebaseUser) {
  const email = (firebaseUser.email ?? '').toLowerCase();
  const role = DEMO_ROLE_BY_EMAIL[email];
  if (!role) return;

  const permissions = ROLE_PERMISSIONS[role] ?? [];
  const membershipRef = doc(db, `users/${firebaseUser.uid}/memberships/${DEMO_ORG_ID}`);
  const userRef = doc(db, 'users', firebaseUser.uid);

  await setDoc(membershipRef, {
    orgId: DEMO_ORG_ID,
    role,
    permissions,
    restaurantIds: [DEMO_RESTAURANT_ID],
    venueIds: [DEMO_RESTAURANT_ID],
    status: 'active',
    isActive: true,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(userRef, {
    currentOrganizationId: DEMO_ORG_ID,
    recentOrganization: {
      orgId: DEMO_ORG_ID,
      restaurantId: DEMO_RESTAURANT_ID,
    },
    organizations: [DEMO_ORG_ID],
    updatedAt: serverTimestamp(),
  }, { merge: true });

  if (typeof window !== 'undefined') {
    localStorage.setItem('gastronauta', '1');
    localStorage.setItem('gastroo_staff_role', role);
  }
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang || 'pl';
  const { t } = useTranslation(lang, 'auth');

  const [view, setView] = useState<View>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [reg, setReg] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Po zalogowaniu RootRouter automatycznie przekierowuje użytkownika
  // na właściwą stronę na podstawie custom claims (isGastronaut, organization).
  useEffect(() => {
    if (!loading && user && typeof window !== 'undefined') {
      localStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
    }
  }, [user, loading]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLoginError(t('auth.errors.emptyFields'));
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await syncUserProfile(credential.user);
      await ensureDemoB2BMembership(credential.user);
      if (typeof window !== 'undefined' && !DEMO_ROLE_BY_EMAIL[(credential.user.email ?? '').toLowerCase()]) {
        localStorage.removeItem('gastroo_staff_role');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setLoginError(t('auth.errors.invalidCredentials'));
      } else if (code === 'auth/too-many-requests') {
        setLoginError(t('auth.errors.tooManyRequests'));
      } else {
        setLoginError(t('auth.errors.generic'));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (IS_EMULATOR_MODE) {
      setLoginError(t('auth.errors.googleEmulatorMode'));
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await syncUserProfile(result.user, {}, { createOrganizationsIfMissing: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user') setLoginError(t('auth.errors.googleGeneric'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
    } catch {
      // do not reveal whether email exists
    } finally {
      setResetSent(true);
      setResetLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!reg.firstName.trim()) errs.firstName = t('auth.register.errors.firstNameRequired');
    if (!reg.lastName.trim()) errs.lastName = t('auth.register.errors.lastNameRequired');
    if (!reg.email.trim()) errs.email = t('auth.register.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) errs.email = t('auth.register.errors.emailInvalid');
    if (!reg.phone.trim()) errs.phone = t('auth.register.errors.phoneRequired');
    if (reg.password.length < 8) errs.password = t('auth.register.errors.passwordMinLength');
    if (reg.password !== reg.confirm) errs.confirm = t('auth.register.errors.passwordMismatch');
    if (Object.keys(errs).length) {
      setRegErrors(errs);
      return;
    }

    setRegLoading(true);
    setRegErrors({});
    try {
      const credential = await createUserWithEmailAndPassword(auth, reg.email.trim(), reg.password);
      const displayName = `${reg.firstName.trim()} ${reg.lastName.trim()}`;
      await updateProfile(credential.user, { displayName });
      await syncUserProfile(
        { ...credential.user, displayName } as FirebaseUser,
        {
          firstName: reg.firstName.trim(),
          lastName: reg.lastName.trim(),
          displayName,
          phone: reg.phone.trim(),
        },
        { createOrganizationsIfMissing: true }
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
        localStorage.setItem('gastronauta', '0');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') setRegErrors({ email: t('auth.register.errors.emailInUse') });
      else setRegErrors({ confirm: t('auth.register.errors.generic') });
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  const cardSx = {
    width: '100%',
    maxWidth: vw(400),
    bgcolor: 'background.paper',
    borderRadius: UI.radius.xl,
    p: UI.space.xl,
    boxShadow: UI.shadow.popover(0.08),
  };

  const BrandLogo = (
    <Box component={Link} href={`/${lang}`} sx={{ textDecoration: 'none', display: 'inline-block', mb: UI.space.xl }}>
      <Typography sx={{ fontWeight: 900, fontSize: 'clamp(1.4rem,4vw,2rem)', letterSpacing: '-0.03em', color: 'text.primary', lineHeight: 1 }}>
        gastroo<Box component="span" sx={{ color: 'primary.main' }}>.</Box>space
      </Typography>
    </Box>
  );

  if (view === 'forgot') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: UI.space.md, bgcolor: 'background.default' }}>
        {BrandLogo}
        <Box sx={cardSx}>
          <Button startIcon={<ArrowBackIcon />} variant="text" size="small" onClick={() => setView('login')} sx={{ mb: UI.space.md }}>
            {t('auth.buttons.back')}
          </Button>
          <Typography fontWeight={700} fontSize="clamp(1.1rem,2.5vw,1.4rem)" mb={UI.space.sm}>
            {t('auth.resetPassword.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={UI.space.lg}>
            {t('auth.resetPassword.instructions')}
          </Typography>
          {resetSent ? (
            <Alert severity="success" sx={{ borderRadius: UI.radius.md }}>
              {t('auth.resetPassword.successMessage')}
            </Alert>
          ) : (
            <form onSubmit={handleForgotPassword} data-testid={TEST_IDS.auth.resetForm}>
              <Stack spacing={UI.space.md}>
                <TextField
                  label={t('auth.login.emailLabel')}
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  fullWidth
                  autoComplete="email"
                  inputProps={{ 'data-testid': TEST_IDS.auth.resetEmailInput }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={resetLoading || !resetEmail.trim()}
                  fullWidth
                  data-testid={TEST_IDS.auth.resetSubmitButton}
                  sx={{ borderRadius: UI.radius.md, fontWeight: 700 }}
                >
                  {resetLoading ? <CircularProgress size={22} color="inherit" /> : t('auth.buttons.sendLink')}
                </Button>
              </Stack>
            </form>
          )}
        </Box>
      </Box>
    );
  }

  if (view === 'register') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: UI.space.md, bgcolor: 'background.default', py: UI.space.xl }}>
        {BrandLogo}
        <Box sx={cardSx}>
          <Button startIcon={<ArrowBackIcon />} variant="text" size="small" onClick={() => setView('login')} sx={{ mb: UI.space.md }}>
            {t('auth.buttons.haveAccount')}
          </Button>
          <Typography fontWeight={700} fontSize="clamp(1.2rem,2.5vw,1.5rem)" mb={UI.space.lg} textAlign="center">
            {t('auth.register.title')}
          </Typography>
          {regErrors.form && <Alert severity="error" sx={{ mb: UI.space.md, borderRadius: UI.radius.md }}>{regErrors.form}</Alert>}
          <form onSubmit={handleRegister} data-testid={TEST_IDS.auth.registerForm}>
            <Stack spacing={UI.space.md}>
              <Stack direction="row" spacing={UI.space.md}>
                <TextField
                  label={t('auth.register.firstNameLabel')}
                  value={reg.firstName}
                  onChange={(e) => setReg((r) => ({ ...r, firstName: e.target.value }))}
                  error={!!regErrors.firstName}
                  helperText={regErrors.firstName}
                  fullWidth
                  autoComplete="given-name"
                  inputProps={{ 'data-testid': TEST_IDS.auth.registerFirstNameInput }}
                />
                <TextField
                  label={t('auth.register.lastNameLabel')}
                  value={reg.lastName}
                  onChange={(e) => setReg((r) => ({ ...r, lastName: e.target.value }))}
                  error={!!regErrors.lastName}
                  helperText={regErrors.lastName}
                  fullWidth
                  autoComplete="family-name"
                  inputProps={{ 'data-testid': TEST_IDS.auth.registerLastNameInput }}
                />
              </Stack>
              <TextField
                label={t('auth.register.emailLabel')}
                type="email"
                value={reg.email}
                onChange={(e) => setReg((r) => ({ ...r, email: e.target.value }))}
                error={!!regErrors.email}
                helperText={regErrors.email}
                fullWidth
                autoComplete="email"
                inputProps={{ 'data-testid': TEST_IDS.auth.registerEmailInput }}
              />
              <TextField
                label={t('auth.register.phoneLabel')}
                type="tel"
                value={reg.phone}
                onChange={(e) => setReg((r) => ({ ...r, phone: e.target.value }))}
                error={!!regErrors.phone}
                helperText={regErrors.phone}
                fullWidth
                autoComplete="tel"
                inputProps={{ 'data-testid': TEST_IDS.auth.registerPhoneInput }}
              />
              <TextField
                label={t('auth.register.passwordLabel')}
                type={showRegPassword ? 'text' : 'password'}
                value={reg.password}
                onChange={(e) => setReg((r) => ({ ...r, password: e.target.value }))}
                error={!!regErrors.password}
                helperText={regErrors.password || t('auth.register.errors.passwordMinLength')}
                fullWidth
                autoComplete="new-password"
                inputProps={{ 'data-testid': TEST_IDS.auth.registerPasswordInput }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowRegPassword((v) => !v)} edge="end" size="small">
                        {showRegPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label={t('auth.register.confirmPasswordLabel')}
                type={showRegPassword ? 'text' : 'password'}
                value={reg.confirm}
                onChange={(e) => setReg((r) => ({ ...r, confirm: e.target.value }))}
                error={!!regErrors.confirm}
                helperText={regErrors.confirm}
                fullWidth
                autoComplete="new-password"
                inputProps={{ 'data-testid': TEST_IDS.auth.registerConfirmPasswordInput }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={regLoading}
                fullWidth
                data-testid={TEST_IDS.auth.registerSubmitButton}
                sx={{ borderRadius: UI.radius.md, fontWeight: 700 }}
              >
                {regLoading ? <CircularProgress size={22} color="inherit" /> : t('auth.register.submitButton')}
              </Button>
            </Stack>
          </form>
          <Box sx={{ textAlign: 'center', mt: UI.space.lg }}>
            <Typography variant="caption" color="text.secondary">
              {t('auth.register.termsPrefix')}{' '}
              <Box component="span" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>{t('auth.register.termsLink')}</Box>
              {' '}{t('auth.register.termsAnd')}{' '}
              <Box component="span" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>{t('auth.register.privacyLink')}</Box>.
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ mt: UI.space.lg }}>v{APP_VERSION}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: UI.space.md, bgcolor: 'background.default', py: UI.space.xl }}>
      {BrandLogo}
      <Box sx={cardSx}>
        <Typography fontWeight={700} fontSize="clamp(1.2rem,2.5vw,1.5rem)" mb={UI.space.lg} textAlign="center">
          {t('auth.login.title')}
        </Typography>
        {loginError && <Alert severity="error" sx={{ mb: UI.space.md, borderRadius: UI.radius.md }}>{loginError}</Alert>}
        <form onSubmit={handleEmailLogin} data-testid={TEST_IDS.auth.loginForm}>
          <Stack spacing={UI.space.md}>
            <TextField
              label={t('auth.login.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoComplete="email"
              inputProps={{ 'data-testid': TEST_IDS.auth.loginEmailInput }}
            />
            <TextField
              label={t('auth.login.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete="current-password"
              inputProps={{ 'data-testid': TEST_IDS.auth.loginPasswordInput }}
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
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loginLoading}
              fullWidth
              data-testid={TEST_IDS.auth.loginSubmitButton}
              sx={{ borderRadius: UI.radius.md, fontWeight: 700 }}
            >
              {loginLoading ? <CircularProgress size={22} color="inherit" /> : t('auth.buttons.login')}
            </Button>
          </Stack>
        </form>
        <Box sx={{ textAlign: 'right', mt: UI.space.xs }}>
          <Button size="small" variant="text" onClick={() => { setResetEmail(email); setView('forgot'); }}>
            {t('auth.buttons.forgotPassword')}
          </Button>
        </Box>
        <Divider sx={{ my: UI.space.lg }}>{t('auth.divider.or')}</Divider>
        <Button
          variant="outlined"
          size="large"
          startIcon={<AdminPanelSettingsIcon />}
          onClick={handleGoogleLogin}
          disabled={loginLoading || IS_EMULATOR_MODE}
          fullWidth
          data-testid={TEST_IDS.auth.loginGoogleButton}
          sx={{ borderRadius: UI.radius.md, fontWeight: 600 }}
        >
          {t('auth.buttons.googleLogin')}
        </Button>
        <Box sx={{ textAlign: 'center', mt: UI.space.lg }}>
          <Typography variant="body2" color="text.secondary">
            {t('auth.login.noAccount')}{' '}
            <Button variant="text" size="small" onClick={() => setView('register')} sx={{ fontWeight: 700 }} data-testid={TEST_IDS.auth.switchToRegisterButton}>
              {t('auth.buttons.register')}
            </Button>
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.disabled" sx={{ mt: UI.space.lg }}>v{APP_VERSION}</Typography>
    </Box>
  );
}
