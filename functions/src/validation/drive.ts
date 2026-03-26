import { z } from 'zod';

export const DriveConnectSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  orgId: z.string().optional(),
  rootFolderId: z.string().optional(),
});

export const DriveListFilesSchema = z.object({
  folderId: z.string().min(1, 'folderId is required'),
  orgId: z.string().min(1, 'orgId is required'),
});

export const DriveGetFileSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
  orgId: z.string().min(1, 'orgId is required'),
});

export const DriveProvisionSchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
  rootFolderId: z.string().optional(),
});

export const DriveDeleteFileSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
  orgId: z.string().min(1, 'orgId is required'),
});

export const DriveUploadMenuImageSchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
  restaurantId: z.string().min(1, 'restaurantId is required'),
  menuItemId: z.string().min(1, 'menuItemId is required'),
  fileName: z.string().min(1, 'fileName is required'),
  mimeType: z.string().min(1, 'mimeType is required'),
  base64Data: z.string().min(1, 'base64Data is required'),
  folderId: z.string().optional(),
});

export const DriveUploadReportCsvSchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
  reportType: z.enum(['owner-logs', 'schedule']),
  fileName: z.string().min(1, 'fileName is required'),
  csvContent: z.string().min(1, 'csvContent is required'),
  folderId: z.string().optional(),
});
