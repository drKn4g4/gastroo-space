/**
 * Firebase Cloud Functions entry point — gastroo.space
 */

import { setGlobalOptions } from "firebase-functions/v2";

// ── Global options ─────────────────────────────────────────────────────────────
setGlobalOptions({ maxInstances: 10,
  region: "europe-west1"
 });

// ── Google Drive Integration ──────────────────────────────────────────────────
export {
  driveConnect,
  driveDisconnect,
  driveDeleteFile,
  driveListFiles,
  driveGetFile,
  driveGetStatus,
  driveProvision,
  driveUploadMenuImage,
  driveUploadReportCsv,
} from "./drive/index";

// ── Google Business Profile Integration ──────────────────────────────────────
export {
  gbpConnect,
  gbpEnsureLocationForOrganization,
  gbpGetLocations,
  gbpGetStatus,
} from "./gbp";

// ── Google Calendar Integration ───────────────────────────────────────────────
export {
  gcalGetStatus,
  gcalConnect,
  gcalDisconnect,
  gcalSyncBookings,
  gcalSyncShifts,
  gcalSyncEvents,
  gcalListEvents,
} from "./calendar";

// ── Google Workspace Integration (Sheets, Docs, Tasks) ───────────────────────
export {
  workspaceGetStatus,
  workspaceConnect,
  workspaceDisconnect,
  workspaceCreateSheet,
  workspaceSyncToSheet,
  workspaceReadSheet,
  workspaceGetTodos,
  workspaceSyncTodos,
  workspaceCreateDoc,
} from "./workspace";

// ── Discovery + Reactive Inventory MVP ───────────────────────────────────────
export {
  discoverySafeToEatCheck,
  inventoryReactiveMenuSync,
  inventoryReactiveMenuSyncLots,
} from "./discoveryAndInventory";

// ── Loyalty points ────────────────────────────────────────────────────────────
export { addLoyaltyPoints } from "./loyalty";

// ── Organization audit logs ──────────────────────────────────────────────────
export { logOrganizationAccess, onFavoriteRestaurantAudit } from "./auditLogs";
