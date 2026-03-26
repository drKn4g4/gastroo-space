import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Konfiguracja globalna dla modułu
 */
const REGION = "europe-west1";
const ORG_ACCESS_LOG_THROTTLE_MS = 5 * 60 * 1000;

interface LogAccessRequest {
  orgId: string;
  restaurantId?: string;
}

// Pomocnicza funkcja do pobierania bazy (modular SDK style)
const db = getFirestore();

/**
 * --- logOrganizationAccess (v2) ---
 * Loguje dostęp do organizacji z throttlingiem 5-minutowym per użytkownik.
 */
export const logOrganizationAccess = onCall<LogAccessRequest>({
  region: REGION,
  maxInstances: 10,
  // Secrets: [] // Tu dodaj klucze API jeśli będziesz ich potrzebował
}, async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Musisz być zalogowany.");
  }

  const { orgId, restaurantId } = data;
  if (!orgId) {
    throw new HttpsError("invalid-argument", "Brak identyfikatora organizacji (orgId).");
  }

  const callerUid = auth.uid;

  // 1. Sprawdzenie uprawnień (Parallel reads)
  const [membershipSnap, legacyMemberSnap] = await Promise.all([
    db.doc(`users/${callerUid}/memberships/${orgId}`).get(),
    db.doc(`organizations/${orgId}/members/${callerUid}`).get(),
  ]);

  const role = 
    (membershipSnap.data()?.status === "active" ? membershipSnap.data()?.role : undefined) || 
    legacyMemberSnap.data()?.role;

  if (!role) {
    throw new HttpsError("permission-denied", "Brak aktywnego członkostwa w organizacji.");
  }

  // 2. Obsługa throttlingu w transakcji
  const throttleRef = db.doc(`organizations/${orgId}/accessLogs/${callerUid}`);
  const now = Date.now();
  let shouldCreateLog = true;

  await db.runTransaction(async (txn) => {
    const throttleSnap = await txn.get(throttleRef);
    const lastLoggedAt = throttleSnap.data()?.lastLoggedAt?.toMillis?.();

    if (lastLoggedAt && (now - lastLoggedAt < ORG_ACCESS_LOG_THROTTLE_MS)) {
      shouldCreateLog = false;
      return;
    }

    txn.set(throttleRef, {
      uid: callerUid,
      orgId,
      role,
      lastRestaurantId: restaurantId || null,
      lastLoggedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  if (!shouldCreateLog) {
    return { success: true, throttled: true };
  }

  // 3. Zapis właściwego logu audytowego
  await db.collection(`organizations/${orgId}/logs`).add({
    orgId,
    action: "auth.organization.accessed",
    source: "functions.logOrganizationAccess",
    actorUid: callerUid,
    actorRole: role,
    restaurantId: restaurantId || null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, throttled: false };
});

/**
 * --- onFavoriteRestaurantAudit (v2) ---
 * Reaguje na dodanie/usunięcie ulubionej restauracji.
 */
export const onFavoriteRestaurantAudit = onDocumentWritten({
  document: "users/{uid}/favoriteRestaurants/{restaurantId}",
  region: REGION,
}, async (event) => {
  const { uid, restaurantId } = event.params;
  const change = event.data;

  if (!change) {
    logger.warn("Brak danych w zdarzeniu (event.data is undefined)");
    return;
  }

  const isAdded = !change.before.exists && change.after.exists;
  const isRemoved = change.before.exists && !change.after.exists;

  // Jeśli to tylko update (np. zmiana nazwy, a nie dodanie/usunięcie), ignorujemy
  if (!isAdded && !isRemoved) return;

  try {
    const docData = (isAdded ? change.after.data() : change.before.data()) || {};
    const orgId = docData.organizationId;

    if (!orgId || typeof orgId !== "string") {
      logger.debug(`Pominięto log: brak organizationId dla restauracji ${restaurantId}`);
      return;
    }

    await db.collection(`organizations/${orgId}/logs`).add({
      orgId,
      action: isAdded ? "favorites.restaurant.added" : "favorites.restaurant.removed",
      source: "functions.onFavoriteRestaurantAudit",
      actorUid: uid,
      actorRole: "consumer",
      targetUid: uid,
      restaurantId,
      restaurantName: docData.restaurantName || null,
      createdAt: FieldValue.serverTimestamp(),
    });

  } catch (err) {
    logger.error("Błąd audytu ulubionych", {
      message: err instanceof Error ? err.message : "Unknown error",
      uid,
      restaurantId
    });
  }
});