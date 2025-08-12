// src/app/[lang]/page.tsx
'use client'

import HeroSection from "./components/HeroSection";
import OfferSection from "./components/OfferSection";
import { useAuth } from "./providers/AuthProvider";
import { Box, CircularProgress } from '@mui/material';
import React, { useState, useEffect } from "react";

export default function Home() {
  const { loading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <HeroSection />
      {/* Możesz tu z powrotem dodać OfferSection lub inne komponenty strony głównej */}
    </>
  );
}