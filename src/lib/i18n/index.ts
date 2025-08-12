import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { fallbackLng, defaultNS, languages } from './settings';

const initI18next = async (lng: string, ns: string | string[]) => {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(resourcesToBackend((language: string, namespace: string) => import(`../../../public/locales/${language}/${namespace}.json`)))
    .init({
      lng,
      fallbackLng,
      supportedLngs: languages,
      defaultNS: defaultNS,
      ns,
    });
  return i18nInstance;
};

export async function useTranslation(lng: string, ns: string | string[] = defaultNS) {
  const i18nextInstance = await initI18next(lng, ns);
  return {
    t: i18nextInstance.getFixedT(lng, Array.isArray(ns) ? ns[0] : ns),
    i18n: i18nextInstance,
  };
}