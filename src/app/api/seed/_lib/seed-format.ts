export type SeedDoc = { id: string; [key: string]: unknown };
export type SeedCollections = Record<string, SeedDoc[]>;

export type SeedExportPayload = {
  firestore: SeedCollections;
  meta: {
    exportedAt: string;
    collections: string[];
    schemaVersion: string;
    profile?: SeedCollectionProfile;
  };
};

export const CURRENT_SEED_SCHEMA_VERSION = '1.1.0';

export const SEED_COLLECTION_PROFILES = {
  core: ['organizations', 'users'],
  demo: ['organizations', 'users', 'restaurants', 'menuItems', 'team'],
  integration: ['organizations', 'users', 'integrations', 'files'],
} as const;

export type SeedCollectionProfile = keyof typeof SEED_COLLECTION_PROFILES;

function parseRequestedProfile(url: URL): SeedCollectionProfile | null {
  const profile = (url.searchParams.get('profile') ?? '').trim();
  if (!profile) {
    return null;
  }

  if (profile === 'core' || profile === 'demo' || profile === 'integration') {
    return profile;
  }

  return null;
}

export function getRequestedCollections(url: URL): string[] {
  const repeated = url.searchParams.getAll('collection').map((value) => value.trim()).filter(Boolean);
  if (repeated.length > 0) {
    return repeated;
  }

  const csv = (url.searchParams.get('collections') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (csv.length > 0) {
    return csv;
  }

  const profile = parseRequestedProfile(url);
  if (profile) {
    return [...SEED_COLLECTION_PROFILES[profile]];
  }

  return [];
}

export function buildSeedExportPayload(
  collectionsMap: SeedCollections,
  collections: string[],
  exportedAt = new Date(),
  profile?: SeedCollectionProfile,
): SeedExportPayload {
  return {
    firestore: collectionsMap,
    meta: {
      exportedAt: exportedAt.toISOString(),
      collections,
      schemaVersion: CURRENT_SEED_SCHEMA_VERSION,
      ...(profile ? { profile } : {}),
    },
  };
}

export function resolveSeedCollections(seed: unknown): SeedCollections {
  if (!seed || typeof seed !== 'object') {
    return {};
  }

  const seedObj = seed as Record<string, unknown>;
  const nested = seedObj.firestore;
  if (nested && typeof nested === 'object') {
    return nested as SeedCollections;
  }

  // Backward compatibility: allow flat payloads from older exports.
  const entries = Object.entries(seedObj).filter(([key, value]) => key !== 'meta' && Array.isArray(value));
  return Object.fromEntries(entries) as SeedCollections;
}

export function resolveCollectionsByProfile(profile?: SeedCollectionProfile): string[] {
  if (!profile) {
    return [];
  }

  return [...SEED_COLLECTION_PROFILES[profile]];
}
