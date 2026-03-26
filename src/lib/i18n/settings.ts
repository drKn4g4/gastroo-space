export const fallbackLng = 'pl'
export const languages = [fallbackLng, 'en']

// Re-export active languages for UI components
export const activeLanguages = languages

// Define namespace structure
export const namespaces = [
  'common', 'navigation', 'hero', 'offer', 'menu', 'management', 'landing',
  'dashboard', 'settings', 'floorplan', 'orders', 'team',
  'auth', 'onboarding', 'pinpad', 'errors',
  'space',
] as const
export type Namespace = (typeof namespaces)[number]

export const defaultNS = 'common'

export function getOptions (lng = fallbackLng, ns: string | Namespace | Namespace[] = defaultNS) {
  const nsArray = Array.isArray(ns) ? ns : (ns ? [ns] : [defaultNS])
  
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns: nsArray,
  }
}
