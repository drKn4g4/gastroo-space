import type { Metadata, Viewport } from 'next'; // Dodaj Viewport dla mobilek
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'gastroo.space — ERP/POS dla gastronomii',
  description: 'A comprehensive SaaS platform for managing restaurants, reservations, menus and teams',
  // KLUCZOWY DODATEK:
  manifest: '/manifest.webmanifest', 
  icons: {
    apple: '/icons/icon-192x192.png', // Ważne dla iOS
  },
};

// PWA wymaga zdefiniowanego viewportu do poprawnego wyświetlania
export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}