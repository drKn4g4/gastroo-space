export type IntegrationConnectionStatus =
  | 'not_connected'
  | 'pending'
  | 'connected'
  | 'degraded'
  | 'error';

export type GoogleIntegrationProvider =
  | 'googleDrive'
  | 'googleBusinessProfile'
  | 'googleCalendar'
  | 'googleWorkspace';

export interface GoogleWorkspaceIntegrationDoc {
  connected: boolean;
  tasksListId?: string | null;
  lastSyncAt?: string | null;
  status: IntegrationConnectionStatus;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface GoogleDriveIntegrationDoc {
  connected: boolean;
  rootFolderId?: string | null;
  menuFolderId?: string | null;
  staffFolderId?: string | null;
  reportsFolderId?: string | null;
  ownerLogsFolderId?: string | null;
  scheduleReportsFolderId?: string | null;
  serviceMode?: 'metadata-only' | 'sync' | 'backup';
  lastSyncAt?: string | null;
  status: IntegrationConnectionStatus;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface GoogleBusinessProfileLocationSummary {
  name: string;
  title?: string;
  storeCode?: string;
  labels?: string[];
  regularHours?: unknown;
  storefrontAddress?: unknown;
}

export interface GoogleBusinessProfileIntegrationDoc {
  connected: boolean;
  accountId?: string | null;
  locationIds: string[];
  primaryLocationId?: string | null;
  hoursSnapshot?: unknown;
  menuSync?: {
    enabled: boolean;
    defaultLanguage?: string;
    locationIdByRestaurantId?: Record<string, string>;
    lastExportAt?: string | null;
  };
  lastSyncAt?: string | null;
  status: IntegrationConnectionStatus;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface GoogleCalendarIntegrationDoc {
  connected: boolean;
  calendarId?: string | null;
  lastSyncAt?: string | null;
  status: IntegrationConnectionStatus;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export type OrganizationFileKind =
  | 'menu-image'
  | 'invoice'
  | 'contract'
  | 'photo'
  | 'export'
  | 'other';

export interface OrganizationFileMeta {
  googleDriveFileId: string;
  kind: OrganizationFileKind;
  mimeType: string;
  size: number;
  checksum: string;
  backupStatus: 'pending' | 'done' | 'failed';
  linkedEntityType: string;
  linkedEntityId: string;
  venueId?: string | null;
  createdBy: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DriveFileDescriptor {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface DriveStatusResponse {
  connected: boolean;
  connected_at?: { seconds: number };
}

export interface DriveConnectRequest {
  code: string;
  orgId?: string;
  rootFolderId?: string;
}

export interface DriveListFilesRequest {
  folderId: string;
  orgId?: string;
}

export interface DriveListFilesResponse {
  files: DriveFileDescriptor[];
}

export interface DriveGetFileRequest {
  fileId: string;
}

export interface DriveGetFileResponse {
  content: unknown;
  mimeType: string;
}

export interface DriveProvisionRequest {
  folderName: string;
  orgId?: string;
}

export interface DriveProvisionResponse {
  rootFolderId: string;
  menuFolderId?: string;
  staffFolderId?: string;
  reportsFolderId?: string;
  ownerLogsFolderId?: string;
  scheduleReportsFolderId?: string;
}

export type DriveReportType = 'owner-logs' | 'schedule';

export interface DriveUploadReportCsvRequest {
  orgId: string;
  reportType: DriveReportType;
  fileName: string;
  csvContent: string;
}

export interface DriveUploadReportCsvResponse {
  fileId: string;
  webViewLink?: string;
  folderId: string;
  folderPath: string;
}

export interface DriveUploadMenuImageRequest {
  orgId: string;
  restaurantId: string;
  menuItemId: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface DriveUploadMenuImageResponse {
  fileId: string;
  imageUrl: string;
  webViewLink?: string;
}

export interface DriveDeleteFileRequest {
  orgId: string;
  fileId: string;
}

export interface GBPStatusResponse {
  connected: boolean;
}

export interface GBPConnectRequest {
  code: string;
  orgId?: string;
}

export interface GBPGetLocationsResponse {
  locations: GoogleBusinessProfileLocationSummary[];
}

export interface GBPEnsureLocationRequest {
  orgId: string;
}

export interface GBPEnsureLocationResponse {
  created: boolean;
  location: GoogleBusinessProfileLocationSummary | null;
}