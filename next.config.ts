// next.config.ts

import type { NextConfig } from "next";
import withPWA from "next-pwa";

// Definiujemy konfigurację dla PWA
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Tutaj umieszczasz swoją główną konfigurację Next.js
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Eksportujemy połączoną konfigurację
export default pwaConfig(nextConfig);