// src/lib/i18n/client.ts
'use client'

import i18next from 'i18next'
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { getOptions, type Namespace } from './settings'

// Inicjalizacja i18next po stronie klienta
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string, namespace: string) => 
    import(`../../../public/locales/${language}/${namespace}.json`)
  ))
  .init({
    ...getOptions(),
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'localStorage'],
    }
  })

export function useTranslation(lng: string, ns?: string | Namespace | Namespace[]) {
  const ret = useTranslationOrg(ns)
  const { i18n } = ret
  if (i18n.resolvedLanguage !== lng) {
    i18n.changeLanguage(lng)
  }
  return ret
}