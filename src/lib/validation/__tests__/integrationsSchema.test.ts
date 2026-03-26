import { describe, expect, it } from 'vitest';
import {
  googleBusinessProfileIntegrationSchema,
  googleCalendarIntegrationSchema,
  googleDriveIntegrationSchema,
  organizationFileMetaSchema,
} from '../integrationsSchema';

describe('integrationsSchema', () => {
  it('accepts valid Google Drive integration metadata', () => {
    const result = googleDriveIntegrationSchema.safeParse({
      connected: true,
      rootFolderId: 'folder-1',
      serviceMode: 'metadata-only',
      status: 'connected',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid Google Drive status', () => {
    const result = googleDriveIntegrationSchema.safeParse({
      connected: true,
      status: 'broken',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid GBP integration metadata', () => {
    const result = googleBusinessProfileIntegrationSchema.safeParse({
      connected: false,
      locationIds: ['locations/123'],
      menuSync: {
        enabled: true,
        defaultLanguage: 'pl',
        locationIdByRestaurantId: {
          'demo-bistro': 'locations/123',
        },
      },
      status: 'pending',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid Google Calendar integration metadata', () => {
    const result = googleCalendarIntegrationSchema.safeParse({
      connected: false,
      calendarId: 'calendar-1',
      status: 'not_connected',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid organization file metadata', () => {
    const result = organizationFileMetaSchema.safeParse({
      googleDriveFileId: 'file-1',
      kind: 'invoice',
      mimeType: 'application/pdf',
      size: 1024,
      checksum: 'sha256:abc',
      backupStatus: 'done',
      linkedEntityType: 'supplierInvoice',
      linkedEntityId: 'inv-1',
      venueId: 'demo-bistro',
      createdBy: 'user-1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects negative file size metadata', () => {
    const result = organizationFileMetaSchema.safeParse({
      googleDriveFileId: 'file-1',
      kind: 'invoice',
      mimeType: 'application/pdf',
      size: -1,
      checksum: 'sha256:abc',
      backupStatus: 'done',
      linkedEntityType: 'supplierInvoice',
      linkedEntityId: 'inv-1',
      createdBy: 'user-1',
    });

    expect(result.success).toBe(false);
  });
});