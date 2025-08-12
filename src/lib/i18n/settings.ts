// src/lib/i18n/settings.ts
export const fallbackLng = 'pl'
export const languages = [fallbackLng, 'en']
export const defaultNS = 'common'

export function getOptions (lng = fallbackLng, ns = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  }
}