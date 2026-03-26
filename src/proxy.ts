import { NextRequest, NextResponse } from 'next/server';
import { i18n } from './i18n-config';

const PUBLIC_FILE = /\.(.*)$/;

function hasLocalePrefix(pathname: string): boolean {
  return i18n.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Keep a single browser origin in dev to avoid split auth/localStorage state
  // between 127.0.0.1 and localhost (they are different origins).
  if (request.nextUrl.hostname.startsWith('127.') || request.nextUrl.hostname === '::1') {
    const url = request.nextUrl.clone();
    url.hostname = 'localhost';
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/offline' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (hasLocalePrefix(pathname)) {
    return NextResponse.next();
  }

  const locale = i18n.defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
  url.search = search;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};