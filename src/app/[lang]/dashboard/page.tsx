// src/app/[lang]/dashboard/page.tsx
'use client';

import { useAuth } from '../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react'; // Upewnij się, że 'useEffect' jest zaimportowany
import { Box, Typography, Paper, CircularProgress } from '@mui/material';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // --- POPRAWIONA LOGIKA ---
  // Hook useEffect jest teraz na najwyższym poziomie i zawsze się wykonuje.
  useEffect(() => {
    // Warunek sprawdzający jest teraz WEWNĄTRZ hooka.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]); // Zależności pozostają bez zmian

  // Stan ładowania: Pokaż spinner, dopóki nie mamy pewności
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Jeśli jest użytkownik, pokaż panel. Jeśli nie, useEffect już go przekierowuje,
  // więc możemy po prostu nic nie renderować (lub spinner), aby uniknąć "mignięcia".
  if (!user) {
    return null; // Lub <CircularProgress />, jeśli wolisz
  }

  // Stan "jest użytkownik": Pokaż panel
  return (
    <Box sx={{ p: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4">Witaj w Panelu, {user.displayName}!</Typography>
        <Typography>To jest Twoja chroniona strona.</Typography>
        <Typography>Twój email: {user.email}</Typography>
        <Typography>UID: {user.uid}</Typography>
      </Paper>
    </Box>
  );
}