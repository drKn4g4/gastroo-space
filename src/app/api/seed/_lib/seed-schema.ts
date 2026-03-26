import { z } from 'zod';

const SeedDocSchema = z.object({
  id: z.string().min(1),
}).passthrough();

const FirestoreCollectionsSchema = z.record(z.string(), z.array(SeedDocSchema));

const SeedMetaSchema = z.object({
  exportedAt: z.string().optional(),
  collections: z.array(z.string()).optional(),
  schemaVersion: z.string().optional(),
  profile: z.string().optional(),
}).passthrough();

export const CanonicalSeedFileSchema = z.object({
  firestore: FirestoreCollectionsSchema,
  meta: SeedMetaSchema.optional(),
}).passthrough();

// Legacy format: top-level keys where values are arrays of docs.
export const LegacySeedFileSchema = z.record(z.string(), z.unknown());

export const ImportModeSchema = z.enum(['strict', 'best-effort']);
export type ImportMode = z.infer<typeof ImportModeSchema>;

export const CollectionProfileSchema = z.enum(['core', 'demo', 'integration']);
export type CollectionProfile = z.infer<typeof CollectionProfileSchema>;

export const SeedImportRequestSchema = z.object({
  seedId: z.string().min(1),
  collections: z.array(z.string().min(1)).optional(),
  profile: CollectionProfileSchema.optional(),
  overwrite: z.boolean().optional().default(false),
  mode: ImportModeSchema.optional().default('strict'),
});

export type SeedImportRequest = z.infer<typeof SeedImportRequestSchema>;
