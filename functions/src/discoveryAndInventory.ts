import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { admin } from './firebaseAdmin';

type SafeToEatRequest = {
  orgId?: string;
  venueId?: string;
  restaurantId?: string;
  prepWindowMin?: number;
  kitchenOffsetMin?: number;
  nowIso?: string;
};

type SafeToEatDecisionInput = {
  nowMinutes: number;
  prepWindowMin: number;
  currentWaitTime: number;
  closeMinutes: number;
  kitchenOffsetMin: number;
};

type VenueLookupResult = {
  venueId: string;
  data: Record<string, unknown>;
  path: string;
  source: 'venues' | 'restaurants';
};

type MenuItemDoc = {
  available?: boolean;
  visible?: boolean;
  reactiveHidden?: boolean;
};

type RecipeDoc = {
  menuItemId?: string;
  ingredientIds?: string[];
  ingredients?: Array<{ ingredientId?: string }>;
  venueIds?: string[];
};

type InventoryLotDoc = {
  ingredientId?: string;
  venueId?: string;
  quantity?: number;
};

type ReactiveMenuState = {
  available: boolean;
  visible: boolean;
  reactiveHidden: boolean;
};

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMinutesFromHHmm(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;

  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;

  return h * 60 + mm;
}

function getNowMinutesInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

function resolveClosingTimeMinutes(restaurant: Record<string, unknown>, dayKey: string): number | null {
  const directCandidates = [
    restaurant.gbpClosingTime,
    restaurant.closingTime,
    restaurant.closeTime,
  ];

  for (const candidate of directCandidates) {
    const parsed = parseMinutesFromHHmm(candidate);
    if (parsed != null) return parsed;
  }

  const hours = restaurant.hours as Record<string, unknown> | undefined;
  if (hours && typeof hours === 'object') {
    const day = hours[dayKey] as Record<string, unknown> | undefined;
    if (day && typeof day === 'object' && day.closed !== true) {
      const parsed = parseMinutesFromHHmm(day.close);
      if (parsed != null) return parsed;
    }
  }

  const regularHours = restaurant.regularHours as Record<string, unknown> | undefined;
  if (regularHours && typeof regularHours === 'object') {
    const day = regularHours[dayKey] as Record<string, unknown> | undefined;
    if (day && typeof day === 'object') {
      const parsed = parseMinutesFromHHmm(day.closeTime ?? day.close);
      if (parsed != null) return parsed;
    }
  }

  return null;
}

function normalizeCloseMinutes(closeMinutes: number, nowMinutes: number): number {
  if (closeMinutes <= nowMinutes) {
    return closeMinutes + 24 * 60;
  }
  return closeMinutes;
}

function getTodayKeyInTimezone(now: Date, timezone: string): string {
  const key = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now).toLowerCase();

  if (key === 'mon') return 'monday';
  if (key === 'tue') return 'tuesday';
  if (key === 'wed') return 'wednesday';
  if (key === 'thu') return 'thursday';
  if (key === 'fri') return 'friday';
  if (key === 'sat') return 'saturday';
  return 'sunday';
}

function collectIngredientIds(recipe: RecipeDoc): string[] {
  const result = new Set<string>();

  for (const id of recipe.ingredientIds ?? []) {
    if (typeof id === 'string' && id.trim()) {
      result.add(id);
    }
  }

  for (const part of recipe.ingredients ?? []) {
    if (typeof part?.ingredientId === 'string' && part.ingredientId.trim()) {
      result.add(part.ingredientId);
    }
  }

  return Array.from(result);
}

export function resolveSafeToEatVenueId(data: SafeToEatRequest): string | null {
  const directVenueId = data.venueId?.trim();
  if (directVenueId) return directVenueId;

  const legacyRestaurantId = data.restaurantId?.trim();
  if (legacyRestaurantId) return legacyRestaurantId;

  return null;
}

export function computeSafeToEatDecision(input: SafeToEatDecisionInput) {
  const projectedReadyMinute = input.nowMinutes + input.prepWindowMin + input.currentWaitTime;
  const latestSafeOrderMinute = input.closeMinutes - input.kitchenOffsetMin;
  const safe = projectedReadyMinute < latestSafeOrderMinute;

  return {
    safe,
    formula: {
      nowMinutes: input.nowMinutes,
      prepWindowMin: input.prepWindowMin,
      currentWaitTime: input.currentWaitTime,
      closeMinutes: input.closeMinutes,
      kitchenOffsetMin: input.kitchenOffsetMin,
      projectedReadyMinute,
      latestSafeOrderMinute,
    },
    reasonCode: safe ? 'SAFE_TO_EAT' : 'UNSAFE_WINDOW',
    reason: safe ? 'SAFE_TO_EAT' : 'UNSAFE_WINDOW',
  };
}

async function loadVenueDocument(orgId: string, venueId: string): Promise<VenueLookupResult | null> {
  const candidates = [
    {
      path: `organizations/${orgId}/venues/${venueId}`,
      source: 'venues' as const,
    },
    {
      path: `organizations/${orgId}/restaurants/${venueId}`,
      source: 'restaurants' as const,
    },
  ];

  for (const candidate of candidates) {
    const snap = await admin.firestore().doc(candidate.path).get();
    if (snap.exists) {
      return {
        venueId,
        data: (snap.data() ?? {}) as Record<string, unknown>,
        path: candidate.path,
        source: candidate.source,
      };
    }
  }

  return null;
}

async function writeAuditLog(entry: {
  orgId: string;
  venueId: string;
  action: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  actorUid?: string;
}) {
  await admin.firestore().collection(`organizations/${entry.orgId}/logs`).add({
    orgId: entry.orgId,
    venueId: entry.venueId,
    restaurantId: entry.venueId,
    actorUid: entry.actorUid ?? null,
    source: 'function',
    action: entry.action,
    path: entry.path,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export function computeReactiveMenuState(current: MenuItemDoc, canCook: boolean): ReactiveMenuState {
  return {
    available: canCook,
    visible: canCook
      ? current.reactiveHidden === true
        ? true
        : current.visible ?? true
      : false,
    reactiveHidden: !canCook,
  };
}

async function loadRecipeDocs(orgId: string, venueId: string, ingredientId: string) {
  const orgRecipes = admin.firestore().collection(`organizations/${orgId}/recipes`);
  const orgRecipeByIndex = await orgRecipes.where('ingredientIds', 'array-contains', ingredientId).get();

  if (!orgRecipeByIndex.empty) {
    return orgRecipeByIndex.docs.filter((doc) => {
      const data = doc.data() as RecipeDoc;
      return !Array.isArray(data.venueIds) || data.venueIds.length === 0 || data.venueIds.includes(venueId);
    });
  }

  const legacyRecipes = admin.firestore().collection(`organizations/${orgId}/restaurants/${venueId}/recipes`);
  const legacyByIndex = await legacyRecipes.where('ingredientIds', 'array-contains', ingredientId).get();
  if (!legacyByIndex.empty) {
    return legacyByIndex.docs;
  }

  const legacyAll = await legacyRecipes.get();
  return legacyAll.docs.filter((doc) => collectIngredientIds(doc.data() as RecipeDoc).includes(ingredientId));
}

async function getMenuItemSnapshot(orgId: string, venueId: string, menuItemId: string) {
  const orgRef = admin.firestore().doc(`organizations/${orgId}/menuItems/${menuItemId}`);
  const orgSnap = await orgRef.get();
  if (orgSnap.exists) {
    return { ref: orgRef, snap: orgSnap };
  }

  const legacyRef = admin.firestore().doc(`organizations/${orgId}/restaurants/${venueId}/menuItems/${menuItemId}`);
  const legacySnap = await legacyRef.get();
  if (legacySnap.exists) {
    return { ref: legacyRef, snap: legacySnap };
  }

  return null;
}

async function getIngredientAvailability(orgId: string, venueId: string, ingredientId: string): Promise<number> {
  const lotsSnap = await admin
    .firestore()
    .collection(`organizations/${orgId}/inventoryLots`)
    .where('ingredientId', '==', ingredientId)
    .where('venueId', '==', venueId)
    .get();

  if (!lotsSnap.empty) {
    return lotsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() as InventoryLotDoc;
      return sum + toFiniteNumber(data.quantity, 0);
    }, 0);
  }

  const legacyIngredientSnap = await admin
    .firestore()
    .doc(`organizations/${orgId}/restaurants/${venueId}/ingredients/${ingredientId}`)
    .get();

  if (!legacyIngredientSnap.exists) {
    return 0;
  }

  return toFiniteNumber(legacyIngredientSnap.data()?.stockQuantity, 0);
}

async function syncReactiveMenuForIngredient(params: {
  orgId: string;
  venueId: string;
  ingredientId: string;
  beforeStock: number;
  afterStock: number;
}) {
  const recipes = await loadRecipeDocs(params.orgId, params.venueId, params.ingredientId);
  const menuItemIds = new Set<string>();

  for (const recipeDoc of recipes) {
    const data = recipeDoc.data() as RecipeDoc;
    if (typeof data.menuItemId === 'string' && data.menuItemId.trim()) {
      menuItemIds.add(data.menuItemId);
    }
  }

  for (const menuItemId of menuItemIds) {
    const recipeSnap = recipes.find((doc) => (doc.data() as RecipeDoc).menuItemId === menuItemId);
    const recipe = recipeSnap?.data() as RecipeDoc | undefined;
    if (!recipe) continue;

    const ingredientIds = collectIngredientIds(recipe);
    if (ingredientIds.length === 0) continue;

    const ingredientStocks = await Promise.all(
      ingredientIds.map((id) => getIngredientAvailability(params.orgId, params.venueId, id)),
    );
    const canCook = ingredientStocks.every((stock) => stock > 0);

    const menuEntry = await getMenuItemSnapshot(params.orgId, params.venueId, menuItemId);
    if (!menuEntry) continue;

    const current = (menuEntry.snap.data() ?? {}) as MenuItemDoc;
    const nextState = computeReactiveMenuState(current, canCook);

    const changed =
      current.available !== nextState.available ||
      current.visible !== nextState.visible ||
      current.reactiveHidden !== nextState.reactiveHidden;

    if (!changed) continue;

    await menuEntry.ref.update({
      available: nextState.available,
      visible: nextState.visible,
      reactiveHidden: nextState.reactiveHidden,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      orgId: params.orgId,
      venueId: params.venueId,
      action: 'menu.reactive-availability.sync',
      path: menuEntry.ref.path,
      oldValue: {
        available: current.available,
        visible: current.visible,
        reactiveHidden: current.reactiveHidden,
      },
      newValue: {
        available: nextState.available,
        visible: nextState.visible,
        reactiveHidden: nextState.reactiveHidden,
        cause: {
          ingredientId: params.ingredientId,
          beforeStock: params.beforeStock,
          afterStock: params.afterStock,
        },
      },
    });
  }
}

export const discoverySafeToEatCheck = onCall({ maxInstances: 20 }, async (request) => {
  const data = (request.data ?? {}) as SafeToEatRequest;
  const orgId = data.orgId?.trim();
  const venueId = resolveSafeToEatVenueId(data);

  if (!orgId || !venueId) {
    throw new HttpsError('invalid-argument', 'orgId and venueId are required (restaurantId is supported as fallback)');
  }

  const venue = await loadVenueDocument(orgId, venueId);
  if (!venue) {
    throw new HttpsError('not-found', 'Venue not found');
  }

  const venueData = venue.data;
  const timezone = typeof venueData.timezone === 'string' ? venueData.timezone : 'Europe/Warsaw';
  const now = data.nowIso ? new Date(data.nowIso) : new Date();

  if (Number.isNaN(now.getTime())) {
    throw new HttpsError('invalid-argument', 'Invalid nowIso date');
  }

  const prepWindowMin = toFiniteNumber(data.prepWindowMin, 90);
  const kitchenOffsetMin = toFiniteNumber(
    data.kitchenOffsetMin,
    toFiniteNumber(venueData.kitchenOffsetMin, 30),
  );
  const currentWaitTime = toFiniteNumber(
    venueData.currentWaitTime,
    toFiniteNumber(venueData.waitTimeMinutes, 0),
  );

  const dayKey = getTodayKeyInTimezone(now, timezone);
  const closeMinutesRaw = resolveClosingTimeMinutes(venueData, dayKey);

  if (closeMinutesRaw == null) {
    throw new HttpsError(
      'failed-precondition',
      'Closing time not configured. Set restaurant.hours or restaurant.gbpClosingTime.',
    );
  }

  const nowMinutes = getNowMinutesInTimezone(now, timezone);
  const closeMinutes = normalizeCloseMinutes(closeMinutesRaw, nowMinutes);

  const decision = computeSafeToEatDecision({
    nowMinutes,
    prepWindowMin,
    currentWaitTime,
    closeMinutes,
    kitchenOffsetMin,
  });

  return {
    safe: decision.safe,
    formula: decision.formula,
    reasonCode: decision.reasonCode,
    reason: decision.reason,
    timezone,
    orgId,
    venueId,
    restaurantId: venue.source === 'restaurants' ? venueId : data.restaurantId?.trim() ?? venueId,
    venuePath: venue.path,
    venueSource: venue.source,
  };
});

export const inventoryReactiveMenuSync = onDocumentWritten(
  'organizations/{orgId}/restaurants/{restaurantId}/ingredients/{ingredientId}',
  async (event) => {
    try {
      const before = event.data?.before;
      const after = event.data?.after;
      const orgId = event.params.orgId;
      const restaurantId = event.params.restaurantId;
      const ingredientId = event.params.ingredientId;

      const beforeStock = before?.exists ? toFiniteNumber(before.data()?.stockQuantity, 0) : 0;
      const afterStock = after?.exists ? toFiniteNumber(after.data()?.stockQuantity, 0) : 0;

      if (beforeStock === afterStock) {
        return;
      }

      await syncReactiveMenuForIngredient({
        orgId,
        venueId: restaurantId,
        ingredientId,
        beforeStock,
        afterStock,
      });
    } catch (error) {
      logger.error('inventoryReactiveMenuSync failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        params: event.params,
      });
    }
  },
);

export const inventoryReactiveMenuSyncLots = onDocumentWritten(
  'organizations/{orgId}/inventoryLots/{lotId}',
  async (event) => {
    try {
      const before = event.data?.before;
      const after = event.data?.after;
      const orgId = event.params.orgId;

      const beforeData = before?.exists ? (before.data() as InventoryLotDoc) : {};
      const afterData = after?.exists ? (after.data() as InventoryLotDoc) : {};
      const ingredientId = String(afterData.ingredientId ?? beforeData.ingredientId ?? '').trim();
      const venueId = String(afterData.venueId ?? beforeData.venueId ?? '').trim();

      if (!ingredientId || !venueId) {
        return;
      }

      const beforeStock = before?.exists ? toFiniteNumber(beforeData.quantity, 0) : 0;
      const afterStock = after?.exists ? toFiniteNumber(afterData.quantity, 0) : 0;

      if (beforeStock === afterStock) {
        return;
      }

      await syncReactiveMenuForIngredient({
        orgId,
        venueId,
        ingredientId,
        beforeStock,
        afterStock,
      });
    } catch (error) {
      logger.error('inventoryReactiveMenuSyncLots failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        params: event.params,
      });
    }
  },
);
