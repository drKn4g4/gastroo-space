import { z } from 'zod';

export const integrationConnectionStatusSchema = z.enum([
  'not_connected',
  'pending',
  'connected',
  'degraded',
  'error',
]);

export const googleDriveIntegrationSchema = z.object({
  connected: z.boolean(),
  rootFolderId: z.string().min(1).nullable().optional(),
  menuFolderId: z.string().min(1).nullable().optional(),
  staffFolderId: z.string().min(1).nullable().optional(),
  serviceMode: z.enum(['metadata-only', 'sync', 'backup']).optional(),
  lastSyncAt: z.string().datetime().nullable().optional(),
  status: integrationConnectionStatusSchema,
  updatedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().nullable().optional(),
});

export const googleBusinessProfileIntegrationSchema = z.object({
  connected: z.boolean(),
  accountId: z.string().min(1).nullable().optional(),
  locationIds: z.array(z.string()).default([]),
  primaryLocationId: z.string().min(1).nullable().optional(),
  hoursSnapshot: z.unknown().optional(),
  menuSync: z.object({
    enabled: z.boolean(),
    defaultLanguage: z.string().min(2).optional(),
    locationIdByRestaurantId: z.record(z.string(), z.string()).optional(),
    lastExportAt: z.string().datetime().nullable().optional(),
  }).optional(),
  lastSyncAt: z.string().datetime().nullable().optional(),
  status: integrationConnectionStatusSchema,
  updatedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().nullable().optional(),
});

export const googleCalendarIntegrationSchema = z.object({
  connected: z.boolean(),
  calendarId: z.string().min(1).nullable().optional(),
  lastSyncAt: z.string().datetime().nullable().optional(),
  status: integrationConnectionStatusSchema,
  updatedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().nullable().optional(),
});

export const organizationFileMetaSchema = z.object({
  googleDriveFileId: z.string().min(1),
  kind: z.enum(['menu-image', 'invoice', 'contract', 'photo', 'export', 'other']),
  mimeType: z.string().min(1),
  size: z.number().nonnegative(),
  checksum: z.string().min(1),
  backupStatus: z.enum(['pending', 'done', 'failed']),
  linkedEntityType: z.string().min(1),
  linkedEntityId: z.string().min(1),
  venueId: z.string().min(1).nullable().optional(),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
});

export type GoogleDriveIntegration = z.infer<typeof googleDriveIntegrationSchema>;
export type GoogleBusinessProfileIntegration = z.infer<typeof googleBusinessProfileIntegrationSchema>;
export type GoogleCalendarIntegration = z.infer<typeof googleCalendarIntegrationSchema>;
export type OrganizationFileMeta = z.infer<typeof organizationFileMetaSchema>;