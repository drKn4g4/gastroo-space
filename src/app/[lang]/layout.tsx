// src/app/[lang]/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import { OrganizationProvider } from "./providers/OrganizationProvider";
import { GeolocationProvider } from "./providers/GeolocationProvider";
import { SessionProvider } from "./providers/SessionProvider";
import ThemeRegistry from "./components/ThemeRegistry";
import ClientShell from "./components/ClientShell";
import { NotificationProvider } from "./components/Notification";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallPWA from "./components/InstallPWA";
import RootRouter from "./components/RootRouter";
import SlotZeroBanner from "./components/SlotZeroBanner";
import SessionDashboard from "./components/SessionDashboard";
import DevSessionDiagnostics from "./components/DevSessionDiagnostics";

export const metadata: Metadata = {
  applicationName: 'Gastroo Space',
  title: 'Gastroo Space',
  description: 'Your pilot for restaurant management.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gastroo',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#111720' },
    { media: '(prefers-color-scheme: light)', color: '#f9f9ff' },
  ],
};

// All pages under [lang] require auth context (Firebase client SDK) — disable static prerender.
// This prevents build-time `auth/invalid-api-key` errors and is correct because every
// meaningful page is behind authentication anyway.
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <GeolocationProvider>
          <SessionProvider>
            <ThemeRegistry>
              <NotificationProvider>
                <ErrorBoundary>
                  <RootRouter>
                    <ClientShell>{children}</ClientShell>
                  </RootRouter>
                  <SlotZeroBanner />
                  <SessionDashboard />
                  <InstallPWA />
                  {process.env.NODE_ENV === 'development' && <DevSessionDiagnostics />}
                </ErrorBoundary>
              </NotificationProvider>
            </ThemeRegistry>
          </SessionProvider>
        </GeolocationProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}
