import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { admin } from "./firebaseAdmin";

// Definiujemy stałą dla regionu, aby łatwo było ją zmienić w przyszłości
const REGION = "europe-west1";

interface LogOrganizationAccessPayload {
  orgId?: unknown;
  restaurantId?: unknown;
}

const ORG_ACCESS_LOG_THROTTLE_MS = 5 * 60 * 1000;

// --- REFAKTOR onCall (v2) ---
export const logOrganizationAccess = onCall({
  region: REGION,
  maxInstances: 10
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { orgId, restaurantId } = request.data as LogOrganizationAccessPayload;

  if (typeof orgId !== "string" || !orgId) {
    throw new HttpsError("invalid-argument", "orgId is required.");
  }

  const callerUid = request.auth.uid;

  const [membershipSnap, legacyMemberSnap] = await Promise.all([
    admin.firestore().doc(`users/${callerUid}/memberships/${orgId}`).get(),
    admin.firestore().doc(`organizations/${orgId}/members/${callerUid}`).get(),
  ]);

  const membershipData = membershipSnap.exists ? membershipSnap.data() : undefined;
  const legacyData = legacyMemberSnap.exists ? legacyMemberSnap.data() : undefined;

  const role =
    (membershipData?.status === "active" ? membershipData.role : undefined) ??
    legacyData?.role;

  if (!role) {
    throw new HttpsError("permission-denied", "Caller is not an active org member.");
  }

  const throttleRef = admin
    .firestore()
    .doc(`organizations/${orgId}/accessLogs/${callerUid}`);

  const now = Date.now();
  let shouldCreateLog = true;

  await admin.firestore().runTransaction(async (txn) => {
    const throttleSnap = await txn.get(throttleRef);
    const lastAt = throttleSnap.data()?.lastLoggedAt?.toMillis?.() as number | undefined;

    if (typeof lastAt === "number" && now - lastAt < ORG_ACCESS_LOG_THROTTLE_MS) {
      shouldCreateLog = false;
      return;
    }

    txn.set(
      throttleRef,
      {
        uid: callerUid,
        orgId,
        role,
        lastRestaurantId: typeof restaurantId === "string" ? restaurantId : null,
        lastLoggedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  if (!shouldCreateLog) {
    return { success: true, throttled: true };
  }

  await admin.firestore().collection(`organizations/${orgId}/logs`).add({
    orgId,
    action: "auth.organization.accessed",
    source: "functions.logOrganizationAccess",
    actorUid: callerUid,
    actorRole: role,
    restaurantId: typeof restaurantId === "string" ? restaurantId : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, throttled: false };
});

// --- REFAKTOR onDocumentWritten (v2 + Eventarc Fix) ---
export const onFavoriteRestaurantAudit = onDocumentWritten({
  document: "users/{uid}/favoriteRestaurants/{restaurantId}",
  region: REGION, // KLUCZOWE: zrównanie z regionem Firestore (eur3 -> europe-west1)
}, async (event) => {
  try {
    const uid = event.params.uid;
    const restaurantId = event.params.restaurantId;
    const before = event.data?.before;
    const after = event.data?.after;

    const beforeExists = before?.exists ?? false;
    const afterExists = after?.exists ?? false;

    if (beforeExists === afterExists) {
      return;
    }

    const docData = (afterExists ? after?.data() : before?.data()) ?? {};
    const orgId = typeof docData.organizationId === "string" ? docData.organizationId : "";

    if (!orgId) {
      return;
    }

    await admin.firestore().collection(`organizations/${orgId}/logs`).add({
      orgId,
      action: afterExists ? "favorites.restaurant.added" : "favorites.restaurant.removed",
      source: "functions.onFavoriteRestaurantAudit",
      actorUid: uid,
      actorRole: "consumer",
      targetUid: uid,
      restaurantId,
      restaurantName: typeof docData.restaurantName === "string" ? docData.restaurantName : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error("onFavoriteRestaurantAudit failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      params: event.params,
    });
  }
});