import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { fallbackLng, defaultNS, languages, type Namespace } from './settings';

const initI18next = async (lng: string, ns: string | Namespace | Namespace[] = defaultNS) => {
  const nsArray = Array.isArray(ns) ? ns : [ns];
  const i18nInstance = createInstance();
  
  await i18nInstance
    .use(initReactI18next)
    .use(resourcesToBackend((language: string, namespace: string) => 
      import(`../../../public/locales/${language}/${namespace}.json`)
    ))
    .init({
      lng,
      fallbackLng,
      supportedLngs: languages,
      defaultNS: defaultNS,
      ns: nsArray,
    });
  
  return i18nInstance;
};

export async function useTranslation(lng: string, ns: string | Namespace | Namespace[] = defaultNS) {
  const i18nextInstance = await initI18next(lng, ns);
  const nsArray = Array.isArray(ns) ? ns : [ns];
  
  return {
    t: i18nextInstance.getFixedT(lng, nsArray[0]),
    i18n: i18nextInstance,
  };
}