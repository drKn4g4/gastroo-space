import { z } from 'zod';
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const PIN_LENGTH = 4;
export const PIN_REGEX = /^\d{4}$/;

export const pinSchema = z
  .string()
  .length(PIN_LENGTH, `PIN musi mieć ${PIN_LENGTH} cyfry`)
  .regex(PIN_REGEX, 'PIN może zawierać tylko cyfry');

/**
 * Check if a PIN is already taken by another member in the same organization.
 * Uses collectionGroup query on `memberships` (path: users/{uid}/memberships/{orgId}).
 *
 * Requires Firestore composite index: memberships(orgId, pin, isActive)
 *
 * @returns true if the PIN is available, false if taken
 */
export async function isPinAvailableInOrg(
  orgId: string,
  pin: string,
  excludeUid?: string,
): Promise<boolean> {
  const q = query(
    collectionGroup(db, 'memberships'),
    where('orgId', '==', orgId),
    where('pin', '==', pin),
    where('isActive', '==', true),
    limit(2),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return true;

  if (excludeUid) {
    // parent = memberships collection, parent.parent = users/{uid} doc
    return snapshot.docs.every((doc) => doc.ref.parent.parent?.id === excludeUid);
  }

  return false;
}

/**
 * Find a member by PIN within an organization.
 * Returns the UID and membership data, or null if not found.
 */
export async function findMemberByPin(
  orgId: string,
  pin: string,
): Promise<{ uid: string; role: string; permissions: string[] } | null> {
  // PIN może być zapisany jako string lub number w Firestore, więc sprawdzamy oba warianty
  const pinAsNumber = /^\d+$/.test(pin) ? Number(pin) : null;
  const queries = [
    query(
      collectionGroup(db, 'memberships'),
      where('orgId', '==', orgId),
      where('pin', '==', pin),
      where('isActive', '==', true),
      limit(5),
    ),
  ];
  if (pinAsNumber !== null) {
    queries.push(
      query(
        collectionGroup(db, 'memberships'),
        where('orgId', '==', orgId),
        where('pin', '==', pinAsNumber),
        where('isActive', '==', true),
        limit(5),
      )
    );
  }

  let found = null;
  for (const q of queries) {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const memberDoc = snapshot.docs[0];
      const data = memberDoc.data();
      const uid = memberDoc.ref.parent.parent?.id;
      if (!uid) return null;
      found = {
        uid,
        role: data.role,
        permissions: data.permissions ?? [],
      };
      break;
    }
  }
  if (!found) {
    console.warn('[PIN-DEBUG] No member found for', { orgId, pin, pinAsNumber });
  }
  return found;
}
