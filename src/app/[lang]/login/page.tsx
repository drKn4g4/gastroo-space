// src/app/[lang]/login/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import app from '@/lib/firebase/config';
import { useAuth } from '../providers/AuthProvider'; // 1. Importujemy hooka useAuth
import { Button, Box, Typography, Paper, CircularProgress } from '@mui/material';

const auth = getAuth(app);

export default function LoginPage() {
  const { user, loading } = useAuth(); // 2. Używamy hooka, aby poznać status użytkownika
  const router = useRouter();

  // 3. Efekt, który sprawdza status logowania przy każdym renderowaniu
  useEffect(() => {
    // Jeśli nie jesteśmy w trakcie ładowania i użytkownik jest zalogowany...
    if (!loading && user) {
      // ...przekieruj go do panelu.
      router.push('/dashboard');
    }
  }, [user, loading, router]); // Uruchom ten efekt, gdy zmieni się user lub loading

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // 4. Po udanym logowaniu, również przekierowujemy do panelu
      router.push('/dashboard');
    } catch (error) {
      console.error("Błąd podczas logowania przez Google", error);
    }
  };

  // 5. Jeśli trwa ładowanie lub użytkownik jest zalogowany, pokazujemy spinner,
  //    aby uniknąć mignięcia formularza logowania.
  if (loading || user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // 6. Pokazuj stronę logowania tylko wtedy, gdy jesteśmy pewni, że użytkownik nie jest zalogowany.
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '80vh' 
      }}
    >
      <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Witaj w gastroo.space
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Zaloguj się, aby zarządzać swoją restauracją.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleGoogleLogin}
          size="large"
        >
          Zaloguj się przez Google
        </Button>
      </Paper>
    </Box>
  );
}