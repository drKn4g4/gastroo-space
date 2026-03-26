'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

// Segmenty URL, na których chowamy Navbar/Footer (pełnoekranowe widoki POS)
const NO_CHROME_SEGMENTS = new Set(['login', 'dashboard', 'onboarding', 'pinpad', 'space']);

export default function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const segments = pathname.split('/').filter(Boolean);
  const isRootLanding = segments.length === 1;
  const hideChrome = isRootLanding || segments.some((seg) => NO_CHROME_SEGMENTS.has(seg));

  return (
    <>
      {!hideChrome && <Navbar />}
      <main>{children}</main>
      {!hideChrome && !isRootLanding && <Footer />}
    </>
  );
}
