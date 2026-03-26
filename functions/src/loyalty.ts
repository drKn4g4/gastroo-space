/**
 * Loyalty points management — gastroo.space
 *
 * Path: users/{uid}/loyaltyPoints/{restaurantId}
 * Schema: { points: number, totalEarned: number, restaurantId: string, orgId: string, updatedAt: Timestamp }
 *
 * Points can only be modified server-side (Admin SDK) — clients never write directly.
 * Firestore rules enforce `allow write: if false` on this path.
 *
 * addLoyaltyPoints  — add (delta > 0) or redeem (delta < 0) points.
 *   Caller must be an org member with role: owner | admin | manager | waiter.
 *   Redemption is transactional; balance is clamped at 0.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { admin } from './firebaseAdmin';
import { AddLoyaltyPointsSchema } from './validation/loyalty';

const ALLOWED_CALLER_ROLES = ['owner', 'admin', 'manager', 'waiter'] as const;

export const addLoyaltyPoints = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { restaurantId, orgId, targetUid, delta } = AddLoyaltyPointsSchema.parse(request.data);

  // ── Caller authorisation (must be active org member with allowed role) ──────
  const callerUid = request.auth.uid;

  // Check new-style membership first, then legacy members subcollection
  const [membershipSnap, legacyMemberSnap] = await Promise.all([
    admin.firestore().doc(`users/${callerUid}/memberships/${orgId}`).get(),
    admin.firestore().doc(`organizations/${orgId}/members/${callerUid}`).get(),
  ]);

  const role: string | undefined =
    (membershipSnap.exists && membershipSnap.data()?.status === 'active'
      ? membershipSnap.data()?.role
      : undefined) ??
    (legacyMemberSnap.exists ? legacyMemberSnap.data()?.role : undefined);

  if (!role || !(ALLOWED_CALLER_ROLES as readonly string[]).includes(role)) {
    throw new HttpsError('permission-denied', 'Caller is not an authorised org member.');
  }

  // ── Atomic update (transaction prevents negative balance on redemption) ─────
  const pointsRef = admin
    .firestore()
    .doc(`users/${targetUid}/loyaltyPoints/${restaurantId}`);

  let prevPoints = 0;
  let nextPoints = 0;
  let nextTotalEarned = 0;

  await admin.firestore().runTransaction(async (txn) => {
    const snap = await txn.get(pointsRef);
    const current = typeof snap.data()?.points === 'number' ? (snap.data()!.points as number) : 0;
    const totalEarned =
      typeof snap.data()?.totalEarned === 'number' ? (snap.data()!.totalEarned as number) : 0;

    if (delta < 0 && Math.abs(delta) > current) {
      throw new HttpsError(
        'failed-precondition',
        `Insufficient points. Current balance: ${current}, requested redemption: ${Math.abs(delta)}.`,
      );
    }

    const newPoints = Math.max(0, current + delta);
    const newTotalEarned = delta > 0 ? totalEarned + delta : totalEarned;
    prevPoints = current;
    nextPoints = newPoints;
    nextTotalEarned = newTotalEarned;

    txn.set(
      pointsRef,
      {
        points: newPoints,
        totalEarned: newTotalEarned,
        restaurantId,
        orgId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await admin.firestore().collection(`organizations/${orgId}/logs`).add({
    orgId,
    action: delta > 0 ? 'loyalty.points.granted' : 'loyalty.points.redeemed',
    source: 'functions.addLoyaltyPoints',
    actorUid: callerUid,
    actorRole: role,
    targetUid,
    restaurantId,
    delta,
    prevPoints,
    nextPoints,
    totalEarned: nextTotalEarned,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('addLoyaltyPoints', { callerUid, targetUid, restaurantId, orgId, delta });

  return { success: true };
});
