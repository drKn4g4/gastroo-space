// SSR redirect do domyślnego języka – landing page jest pod /[lang]/page.tsx
import { redirect } from 'next/navigation';
import { i18n } from '../i18n-config';

export default function RootPage() {
  let lang = i18n.defaultLocale;
  // SSR: fallback na domyślny język
  redirect(`/${lang}`);
  return null;
}
