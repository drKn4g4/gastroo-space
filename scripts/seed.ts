// scripts/seed.ts
//
// Profilowany seed dla Firebase Emulator (Firestore + opcjonalnie Storage).
// Profile:
//   - core        -> users + organization + restaurants + members + memberships
//   - demo        -> core + menu/tables/bookings/shifts/todo/inventory/recipes
//   - integration -> core + integration docs + files metadata
//
// Użycie:
//   SEED_PROFILE=demo NEXT_PUBLIC_USE_EMULATORS=true npx tsx scripts/seed.ts
/* eslint-disable no-console */

import { initializeApp, getApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
  MEMBER_ROLES,
  ROLE_PERMISSIONS,
  type MemberRole,
} from '../src/types/organization';
import { UNIFIED_SEED_SOURCE, resolveSeedProfile, type UnifiedSeedProfile } from './seeds/source';
import type { SeedConfig, SeedRestaurantData } from './seeds/types';
import { createNodeLogger, installConsoleDecorators } from './helpers/node-logger.mjs';

installConsoleDecorators('seed');
const log = createNodeLogger('seed');

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || UNIFIED_SEED_SOURCE.projectId;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

const app = getApps().length ? getApp() : initializeApp({ projectId, storageBucket });
const auth = getAuth(app);
const db = getFirestore(app);

const MASTER_CONFIG: SeedConfig = UNIFIED_SEED_SOURCE.masterConfig;
const EXTRA_RESTAURANTS: SeedRestaurantData[] = UNIFIED_SEED_SOURCE.extraRestaurants;
const ADDITIONAL_ORGANIZATIONS = UNIFIED_SEED_SOURCE.additionalOrganizations;

type SeedProfile = UnifiedSeedProfile;

// type SeedUser = SeedConfig['users'][number];
type AuthSeedUser = (typeof UNIFIED_SEED_SOURCE.authUsers)[number];
type ConsumerSeedUser = (typeof UNIFIED_SEED_SOURCE.unassignedUsers)[number];

type RestaurantConfig = Pick<SeedConfig, 'restaurant' | 'sections' | 'tables' | 'menuCategories' | 'bookings' | 'shifts' | 'todoTasks' | 'ingredients' | 'recipes'>;
type DeletionCandidate = { id: string };

const USER_BY_EMAIL = new Map(MASTER_CONFIG.users.map((u) => [u.email, u]));

function buildRestaurantRegistry() {
  const registry: Array<{
    orgId: string;
    orgName: string;
    restaurantId: string;
    restaurantName: string;
    source: 'core' | 'additional';
  }> = [];

  for (const cfg of buildRestaurantConfigs()) {
    registry.push({
      orgId: MASTER_CONFIG.organization.id,
      orgName: MASTER_CONFIG.organization.name,
      restaurantId: cfg.restaurant.id,
      restaurantName: cfg.restaurant.name,
      source: 'core',
    });
  }

  for (const entry of ADDITIONAL_ORGANIZATIONS) {
    registry.push({
      orgId: entry.organization.id,
      orgName: entry.organization.name,
      restaurantId: entry.restaurantData.restaurant.id,
      restaurantName: entry.restaurantData.restaurant.name,
      source: 'additional',
    });
  }

  return registry;
}

function findRestaurantConfigForOrg(orgId: string, restaurantId: string): RestaurantConfig | SeedRestaurantData | null {
  if (orgId === MASTER_CONFIG.organization.id) {
    return buildRestaurantConfigs().find((cfg) => cfg.restaurant.id === restaurantId) ?? null;
  }

  return ADDITIONAL_ORGANIZATIONS.find(
    (entry) => entry.organization.id === orgId && entry.restaurantData.restaurant.id === restaurantId,
  )?.restaurantData ?? null;
}

function resolveMenuItemId(orgId: string, restaurantId: string, itemName: string): string | null {
  const config = findRestaurantConfigForOrg(orgId, restaurantId);
  if (!config) return null;

  for (const category of config.menuCategories) {
    for (let index = 0; index < category.items.length; index += 1) {
      const item = category.items[index];
      if (item.name === itemName) {
        return buildMenuItemId(category.order, index + 1, item.name);
      }
    }
  }

  return null;
}

function resolveCategoryId(orgId: string, restaurantId: string, categoryName: string): string | null {
  const config = findRestaurantConfigForOrg(orgId, restaurantId);
  if (!config) return null;

  const category = config.menuCategories.find((entry) => entry.name === categoryName);
  return category ? `cat-${category.order}-${slugify(category.name)}` : null;
}

function timestampFromDayOffset(dayOffset: number | undefined) {
  if (typeof dayOffset !== 'number') return undefined;
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return Timestamp.fromDate(date);
}

function buildLoyaltyCardId(email: string) {
  return `card-${slugify(email)}`;
}

const usedUserCodes = new Set<string>();

/** Generate a unique 12-digit numeric user code (xxxx-xxxx-xxxx) */
function generateUniqueUserCode(): string {
  let code: string;
  do {
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    code = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
  } while (usedUserCodes.has(code));
  usedUserCodes.add(code);
  return code;
}

function parseSeedProfile(): SeedProfile {
  const resolved = resolveSeedProfile(process.env.SEED_PROFILE);
  if ((process.env.SEED_PROFILE || 'demo').toLowerCase() !== resolved) {
    console.warn(`⚠️ Nieznany SEED_PROFILE=${process.env.SEED_PROFILE}, używam ${resolved}.`);
  }
  return resolved;
}

function buildRestaurantConfigs(): RestaurantConfig[] {
  return [
    {
      restaurant: MASTER_CONFIG.restaurant,
      sections: MASTER_CONFIG.sections,
      tables: MASTER_CONFIG.tables,
      menuCategories: MASTER_CONFIG.menuCategories,
      bookings: MASTER_CONFIG.bookings,
      shifts: MASTER_CONFIG.shifts,
      todoTasks: MASTER_CONFIG.todoTasks,
      ingredients: MASTER_CONFIG.ingredients,
      recipes: MASTER_CONFIG.recipes,
    },
    ...EXTRA_RESTAURANTS,
  ];
}

function toMemberRole(role: string): MemberRole {
  if ((MEMBER_ROLES as readonly string[]).includes(role)) {
    return role as MemberRole;
  }
  return 'staff';
}

function isoDateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildMenuItemId(categoryOrder: number, itemOrder: number, name: string) {
  return `item-${categoryOrder}-${itemOrder}-${slugify(name)}`;
}

async function deleteDocsByPredicate(
  collectionRef: FirebaseFirestore.CollectionReference,
  shouldDelete: (id: string) => boolean,
) {
  const snap = await collectionRef.get();
  const candidates = snap.docs
    .map((docSnap) => ({ id: docSnap.id }))
    .filter((entry: DeletionCandidate) => shouldDelete(entry.id));

  if (!candidates.length) return 0;

  for (let i = 0; i < candidates.length; i += 400) {
    const batch = db.batch();
    for (const candidate of candidates.slice(i, i + 400)) {
      batch.delete(collectionRef.doc(candidate.id));
    }
    await batch.commit();
  }

  return candidates.length;
}

async function cleanupLegacyVolatileSeedDocs(orgId: string, restaurantId: string) {
  const restRef = db.doc(`organizations/${orgId}/restaurants/${restaurantId}`);
  const shiftLegacyPattern = new RegExp(`^${restaurantId}-shift-.*-\\d{4}-\\d{2}-\\d{2}$`);
  const todoLegacyPattern = new RegExp(`^${restaurantId}-todo-\\d{4}-\\d{2}-\\d{2}-\\d+$`);

  const deletedShifts = await deleteDocsByPredicate(
    restRef.collection('shifts'),
    (id) => shiftLegacyPattern.test(id),
  );

  const deletedTodos = await deleteDocsByPredicate(
    restRef.collection('todoTasks'),
    (id) => todoLegacyPattern.test(id),
  );

  if (deletedShifts > 0 || deletedTodos > 0) {
    console.log(`🧹 Cleanup legacy seed docs (${restaurantId}): shifts=${deletedShifts}, todo=${deletedTodos}`);
  }
}

async function recreateAuthUser(u: AuthSeedUser) {
  const recreateAuth = (process.env.SEED_AUTH_RECREATE ?? 'false') === 'true';
  const displayName = `${u.firstName} ${u.lastName}`.trim();

  let uid: string;

  try {
    const existing = await auth.getUserByEmail(u.email);
    if (recreateAuth) {
      await auth.deleteUser(existing.uid);
    } else {
      await auth.updateUser(existing.uid, {
        displayName,
        password: u.password,
        phoneNumber: u.phone || undefined,
        emailVerified: true,
      });
      await auth.setCustomUserClaims(existing.uid, {
        isGastronaut: u.isGastronaut,
        organization: u.organization,
      });
      return existing.uid;
    }
  } catch {
    // ignore not found
  }

  const created = await auth.createUser({
    email: u.email,
    password: u.password,
    displayName,
    phoneNumber: u.phone || undefined,
    emailVerified: true,
  });
  uid = created.uid;

  await auth.setCustomUserClaims(uid, {
    isGastronaut: u.isGastronaut,
    organization: u.organization,
  });

  return uid;
}

async function seedAuthUsers(users: AuthSeedUser[]): Promise<Record<string, string>> {
  const uidsByEmail: Record<string, string> = {};
  for (const u of users) {
    const uid = await recreateAuthUser(u);
    uidsByEmail[u.email] = uid;
    console.log(`✅ Auth: ${u.email} -> ${uid}`);
  }
  return uidsByEmail;
}

async function seedCoreData(uidsByEmail: Record<string, string>, now: Timestamp) {
  const org = MASTER_CONFIG.organization;
  const orgRef = db.collection('organizations').doc(org.id);
  const restaurantConfigs = buildRestaurantConfigs();
  const restaurantIds = restaurantConfigs.map((r) => r.restaurant.id);

  await orgRef.set({
    ...org,
    owner: uidsByEmail['admin@gastroo.dev'] || null,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ Firestore: organizations/${org.id}`);

  for (const cfg of restaurantConfigs) {
    const restRef = orgRef.collection('restaurants').doc(cfg.restaurant.id);
    await restRef.set({
      ...cfg.restaurant,
      createdAt: now,
      updatedAt: now,
      status: 'active',
    });
    console.log(`✅ Firestore: organizations/${org.id}/restaurants/${cfg.restaurant.id}`);
  }

  for (const u of MASTER_CONFIG.users) {
    const uid = uidsByEmail[u.email];
    const role = toMemberRole(u.role);
    const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff;
    // PIN is defined as string in SeedUser
    const pin: string | null = u.pin || null;

    await orgRef.collection('members').doc(uid).set({
      userId: uid,
      email: u.email,
      displayName: u.displayName,
      role,
      restaurantIds,
      permissions,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    // Wymuś, by recentOrganization.restaurantId i restaurantIds zawsze były zgodne z główną restauracją
    const mainRestaurantId = restaurantIds[0] ?? null;
    await db.collection('users').doc(uid).set({
      userId: uid,
      email: u.email,
      name: u.displayName,
      displayName: u.displayName,
      gastronaut: true,
      userCode: generateUniqueUserCode(),
      qrVersion: 1,
      onboardingCompleted: true,
      viewMode: 'gastronaut',
      currentOrganizationId: org.id,
      currentRestaurantId: mainRestaurantId,
      organizations: [org.id],
      recentOrganization: {
        orgId: org.id,
        restaurantId: mainRestaurantId,
      },
      updatedAt: now,
      createdAt: now,
    }, { merge: true });

    await db.doc(`users/${uid}/memberships/${org.id}`).set({
      orgId: org.id,
      role,
      pin,
      permissions,
      restaurantIds,
      venueIds: restaurantIds,
      status: 'active',
      isActive: true,
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
  }

  console.log(`✅ Firestore: members/users/memberships (${MASTER_CONFIG.users.length})`);
}

async function seedDemoRestaurantData(now: Timestamp, uidsByDisplayName: Record<string, string>) {
  const orgId = MASTER_CONFIG.organization.id;
  const restaurantConfigs = buildRestaurantConfigs();
  const doCleanupLegacy = (process.env.SEED_CLEAN_LEGACY_VOLATILE ?? 'true') === 'true';

  for (const cfg of restaurantConfigs) {
    const restRef = db.doc(`organizations/${orgId}/restaurants/${cfg.restaurant.id}`);

    if (doCleanupLegacy) {
      await cleanupLegacyVolatileSeedDocs(orgId, cfg.restaurant.id);
    }

    const sectionsBatch = db.batch();
    for (const s of cfg.sections) {
      sectionsBatch.set(restRef.collection('sections').doc(s.id), {
        ...s,
        restaurantId: cfg.restaurant.id,
        createdAt: now,
        updatedAt: now,
      });
    }
    await sectionsBatch.commit();

    const tablesBatch = db.batch();
    for (const t of cfg.tables) {
      tablesBatch.set(restRef.collection('tables').doc(t.id), {
        ...t,
        restaurantId: cfg.restaurant.id,
        createdAt: now,
        updatedAt: now,
      });
    }
    await tablesBatch.commit();

    const menuNameToId = new Map<string, string>();

    for (const cat of cfg.menuCategories) {
      const categoryId = `cat-${cat.order}-${slugify(cat.name)}`;
      await restRef.collection('menuCategories').doc(categoryId).set({
        id: categoryId,
        name: cat.name,
        order: cat.order,
        visible: true,
        restaurantId: cfg.restaurant.id,
        createdAt: now,
        updatedAt: now,
      });

      for (let i = 0; i < cat.items.length; i++) {
        const item = cat.items[i];
        const itemId = buildMenuItemId(cat.order, i + 1, item.name);
        menuNameToId.set(item.name, itemId);

        await restRef.collection('menuItems').doc(itemId).set({
          id: itemId,
          categoryId,
          name: item.name,
          description: item.description || null,
          price: item.price,
          basePrice: item.basePrice ?? item.price,
          lowestPriceLast30Days: item.lowestPriceLast30Days ?? item.price,
          currency: cfg.restaurant.settings.currency,
          allergens: item.allergens ?? [],
          vegetarian: item.vegetarian ?? false,
          vegan: item.vegan ?? false,
          glutenFree: item.glutenFree ?? false,
          tags: item.tags ?? [],
          weight: item.weight ?? null,
          itemType: item.itemType ?? 'dish',
          macros: item.macros ?? null,
          nutritionSource: item.nutritionSource ?? (item.macros ? 'manual' : null),
          basePrepTime: item.basePrepTime ?? null,
          targetPrepTime: item.targetPrepTime ?? null,
          fiscalization: item.fiscalization ?? null,
          priceHistory: item.priceHistory ?? [],
          available: item.available,
          visible: item.available,
          reactiveHidden: false,
          order: i + 1,
          restaurantId: cfg.restaurant.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (const ingredient of cfg.ingredients ?? []) {
      await restRef.collection('ingredients').doc(ingredient.id).set({
        ...ingredient,
        restaurantId: cfg.restaurant.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const recipe of cfg.recipes ?? []) {
      const menuItemId = menuNameToId.get(recipe.menuItemName);
      if (!menuItemId) continue;

      const recipeId = `recipe-${slugify(recipe.menuItemName)}`;
      await restRef.collection('recipes').doc(recipeId).set({
        id: recipeId,
        menuItemId,
        menuItemName: recipe.menuItemName,
        ingredients: recipe.ingredients,
        basePrepTimeMin: recipe.basePrepTimeMin,
        preparationSteps: recipe.preparationSteps || null,
        servings: recipe.servings,
        restaurantId: cfg.restaurant.id,
        createdAt: now,
        updatedAt: now,
      });

      await restRef.collection('menuItems').doc(menuItemId).set({
        recipeId,
        basePrepTime: recipe.basePrepTimeMin,
        updatedAt: now,
      }, { merge: true });
    }

    const todayStr = isoDateOffset(0);
    const today = new Date();
    const mk = (h: number) => {
      const d = new Date(today);
      d.setHours(h, 0, 0, 0);
      return Timestamp.fromDate(d);
    };

    for (const shift of cfg.shifts) {
      const role = toMemberRole(shift.role);
      const shiftId = `${cfg.restaurant.id}-shift-${role}-${slugify(shift.displayName)}`;
      await restRef.collection('shifts').doc(shiftId).set({
        staffId: uidsByDisplayName[shift.displayName] || null,
        staffName: shift.displayName,
        role,
        restaurantId: cfg.restaurant.id,
        date: todayStr,
        scheduledStart: mk(shift.startHour),
        scheduledEnd: mk(shift.endHour),
        actualStart: null,
        actualEnd: null,
        breaks: [],
        status: 'scheduled',
        createdAt: now,
      });
    }

    for (let i = 0; i < cfg.todoTasks.length; i++) {
      const task = cfg.todoTasks[i];
      const taskId = `${cfg.restaurant.id}-todo-${i + 1}`;
      await restRef.collection('todoTasks').doc(taskId).set({
        title: task.title,
        description: task.description || null,
        assignedToRoles: task.assignedToRoles,
        isGroupTask: task.isGroupTask,
        priority: task.priority,
        category: task.category,
        shiftDate: todayStr,
        completedBy: null,
        completedAt: null,
        restaurantId: cfg.restaurant.id,
        createdAt: now,
      });
    }

    for (let i = 0; i < cfg.bookings.length; i++) {
      const booking = cfg.bookings[i];
      const bookingId = `${cfg.restaurant.id}-booking-${i + 1}-${booking.dayOffset}-${booking.bookingTime.replace(':', '')}`;
      await db.collection('bookings').doc(bookingId).set({
        name: booking.name,
        guestPhone: booking.guestPhone || null,
        guestEmail: booking.guestEmail || null,
        bookingDate: isoDateOffset(booking.dayOffset),
        bookingTime: booking.bookingTime,
        bookingTimeEnd: booking.bookingTimeEnd || null,
        guestCount: booking.guestCount,
        tableId: booking.tableId || null,
        tableNumber: booking.tableNumber || null,
        tableName: booking.tableName || null,
        source: booking.source || 'manual',
        createdByName: booking.createdByName || 'Seed',
        notes: booking.notes || null,
        status: booking.status || 'confirmed',
        restaurantId: cfg.restaurant.id,
        organizationId: orgId,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`✅ Demo data: ${cfg.restaurant.id}`);
  }
}

async function seedOrganizationMembers(params: {
  orgId: string;
  restaurantId: string;
  ownerEmails: string[];
  memberEmails: string[];
  uidsByEmail: Record<string, string>;
  now: Timestamp;
}) {
  const orgRef = db.collection('organizations').doc(params.orgId);
  const restaurantIds = [params.restaurantId];
  const emails = Array.from(new Set([...params.ownerEmails, ...params.memberEmails]));

  for (const email of emails) {
    const uid = params.uidsByEmail[email];
    if (!uid) continue;

    const seedUser = USER_BY_EMAIL.get(email);
    const role = toMemberRole(params.ownerEmails.includes(email) ? 'owner' : (seedUser?.role ?? 'staff'));
    const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff;

    await orgRef.collection('members').doc(uid).set({
      userId: uid,
      email,
      displayName: seedUser?.displayName ?? email,
      role,
      pin: seedUser?.pin ?? null,
      restaurantIds,
      permissions,
      status: 'active',
      joinedAt: params.now,
      updatedAt: params.now,
    }, { merge: true });

    // Wymuś, by recentOrganization.restaurantId i restaurantIds zawsze były zgodne z główną restauracją
    await db.collection('users').doc(uid).set({
      userId: uid,
      email,
      name: seedUser?.displayName ?? email,
      displayName: seedUser?.displayName ?? email,
      gastronaut: true,
      userCode: generateUniqueUserCode(),
      qrVersion: 1,
      onboardingCompleted: true,
      viewMode: 'gastronaut',
      currentOrganizationId: params.orgId,
      currentRestaurantId: params.restaurantId,
      organizations: FieldValue.arrayUnion(params.orgId),
      recentOrganization: {
        orgId: params.orgId,
        restaurantId: params.restaurantId,
      },
      updatedAt: params.now,
      createdAt: params.now,
    }, { merge: true });

    await db.doc(`users/${uid}/memberships/${params.orgId}`).set({
      orgId: params.orgId,
      role,
      pin: seedUser?.pin ?? null,
      permissions,
      restaurantIds,
      venueIds: restaurantIds,
      status: 'active',
      isActive: true,
      updatedAt: params.now,
      createdAt: params.now,
    }, { merge: true });
  }
}

async function seedUnassignedUsers(now: Timestamp, uidsByEmail: Record<string, string>) {
  const users = UNIFIED_SEED_SOURCE.unassignedUsers;
  if (!users.length) return;

  for (const user of users) {
    const uid = uidsByEmail[user.email];
    if (!uid) continue;

    await db.collection('users').doc(uid).set({
      userId: uid,
      email: user.email,
      name: user.displayName,
      displayName: user.displayName,
      gastronaut: false,
      userCode: generateUniqueUserCode(),
      loyaltyCardId: buildLoyaltyCardId(user.email),
      qrVersion: 1,
      onboardingCompleted: true,
      viewMode: 'foodie',
      currentOrganizationId: null,
      currentRestaurantId: null,
      organizations: [],
      recentOrganization: FieldValue.delete(),
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
  }

  console.log(`✅ Firestore: unassigned users (${users.length})`);
}

async function seedConsumerExperience(now: Timestamp, uidsByEmail: Record<string, string>) {
  const restaurantRegistry = new Map(buildRestaurantRegistry().map((entry) => [entry.restaurantId, entry]));

  for (const consumer of UNIFIED_SEED_SOURCE.unassignedUsers as ConsumerSeedUser[]) {
    const uid = uidsByEmail[consumer.email];
    if (!uid) continue;

    const cardId = buildLoyaltyCardId(consumer.email);
    await db.collection('loyaltyCards').doc(cardId).set({
      id: cardId,
      userId: uid,
      qrVersion: 1,
      status: 'active',
      issuedAt: now,
      lastUsedAt: consumer.loyaltyPoints.length ? now : null,
    }, { merge: true });

    const loyaltyByOrg = new Map<string, { pointsBalance: number; lifetimePoints: number; tier: string; lastActivityAt?: Timestamp }>();

    for (const loyalty of consumer.loyaltyPoints) {
      await db.doc(`users/${uid}/loyaltyPoints/${loyalty.restaurantId}`).set({
        points: loyalty.points,
        totalEarned: loyalty.totalEarned,
        restaurantId: loyalty.restaurantId,
        orgId: loyalty.orgId,
        updatedAt: now,
      }, { merge: true });

      const current = loyaltyByOrg.get(loyalty.orgId) ?? {
        pointsBalance: 0,
        lifetimePoints: 0,
        tier: loyalty.tier,
      };
      current.pointsBalance += loyalty.points;
      current.lifetimePoints += loyalty.totalEarned;
      current.tier = loyalty.tier;
      current.lastActivityAt = timestampFromDayOffset(loyalty.lastActivityDayOffset) ?? current.lastActivityAt;
      loyaltyByOrg.set(loyalty.orgId, current);
    }

    for (const [orgId, summary] of loyaltyByOrg.entries()) {
      await db.doc(`users/${uid}/loyaltyAccounts/${orgId}`).set({
        organizationId: orgId,
        userId: uid,
        cardId,
        pointsBalance: summary.pointsBalance,
        lifetimePoints: summary.lifetimePoints,
        tier: summary.tier,
        lastActivityAt: summary.lastActivityAt ?? now,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    for (const restaurantId of consumer.favoriteRestaurantIds) {
      const restaurant = restaurantRegistry.get(restaurantId);
      await db.doc(`users/${uid}/favoriteRestaurants/${restaurantId}`).set({
        userId: uid,
        restaurantId,
        organizationId: restaurant?.orgId ?? null,
        restaurantName: restaurant?.restaurantName ?? restaurantId,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    for (const favorite of consumer.favoriteMenuItems) {
      const menuItemId = resolveMenuItemId(favorite.orgId, favorite.restaurantId, favorite.itemName);
      const restaurant = restaurantRegistry.get(favorite.restaurantId);
      if (!menuItemId) continue;

      const favoriteDocId = `${favorite.restaurantId}-${menuItemId}`;
      await db.doc(`users/${uid}/favoriteMenuItems/${favoriteDocId}`).set({
        userId: uid,
        organizationId: favorite.orgId,
        restaurantId: favorite.restaurantId,
        restaurantName: restaurant?.restaurantName ?? favorite.restaurantId,
        menuItemId,
        menuItemName: favorite.itemName,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }
  }

  console.log(`✅ Firestore: consumer loyalty/favorites (${UNIFIED_SEED_SOURCE.unassignedUsers.length})`);
}

async function seedPromotions(now: Timestamp) {
  for (const promotion of UNIFIED_SEED_SOURCE.promotions) {
    const orgRef = db.collection('organizations').doc(promotion.orgId);
    const menuItemIds = (promotion.menuItemNames ?? [])
      .map((itemName: string) => resolveMenuItemId(promotion.orgId, promotion.restaurantId, itemName))
      .filter((value: string | null): value is string => Boolean(value));
    const categoryIds = (promotion.categoryNames ?? [])
      .map((categoryName: string) => resolveCategoryId(promotion.orgId, promotion.restaurantId, categoryName))
      .filter((value: string | null): value is string => Boolean(value));

    await orgRef.collection('promotions').doc(promotion.id).set({
      id: promotion.id,
      organizationId: promotion.orgId,
      restaurantId: promotion.restaurantId,
      name: promotion.name,
      description: promotion.description ?? null,
      type: promotion.type,
      status: promotion.status,
      priority: promotion.priority,
      stackable: promotion.stackable,
      scope: {
        menuItemIds,
        categoryIds,
        tags: promotion.tags ?? [],
      },
      schedule: {
        startAt: timestampFromDayOffset(promotion.schedule.startDayOffset) ?? null,
        endAt: timestampFromDayOffset(promotion.schedule.endDayOffset) ?? null,
        daysOfWeek: promotion.schedule.daysOfWeek ?? [],
        timeRanges: promotion.schedule.timeRanges ?? [],
      },
      discountPercentage: promotion.discountPercentage ?? null,
      discountAmount: promotion.discountAmount ?? null,
      fixedPrice: promotion.fixedPrice ?? null,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  console.log(`✅ Firestore: promotions (${UNIFIED_SEED_SOURCE.promotions.length})`);
}

async function seedEvents(now: Timestamp) {
  for (const event of UNIFIED_SEED_SOURCE.events ?? []) {
    const orgRef = db.collection('organizations').doc(event.orgId);
    await orgRef.collection('events').doc(event.id).set({
      id: event.id,
      organizationId: event.orgId,
      restaurantId: event.restaurantId,
      name: event.name,
      description: event.description ?? null,
      type: event.type,
      status: event.status,
      priority: event.priority,
      tags: event.tags ?? [],
      visibility: event.visibility ?? 'public',
      schedule: {
        startAt: timestampFromDayOffset(event.schedule.startDayOffset) ?? null,
        endAt: timestampFromDayOffset(event.schedule.endDayOffset) ?? null,
        daysOfWeek: event.schedule.daysOfWeek ?? [],
        timeRanges: event.schedule.timeRanges ?? [],
      },
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }
  console.log(`✅ Firestore: events (${UNIFIED_SEED_SOURCE.events?.length ?? 0})`);
}

async function seedEmulatorHelperCollections(now: Timestamp, uidsByEmail: Record<string, string>) {
  const helperRoot = db.collection('_seed');
  const loginUsers = [
    ...MASTER_CONFIG.users.map((user) => ({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      role: user.role,
      gastronaut: true,
      organizations: USER_BY_EMAIL.has(user.email) ? undefined : undefined,
    })),
    ...UNIFIED_SEED_SOURCE.unassignedUsers.map((user) => ({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      role: 'consumer',
      gastronaut: false,
    })),
  ];

  for (const user of loginUsers) {
    const uid = uidsByEmail[user.email] ?? null;
    await helperRoot.doc(`login-${slugify(user.email)}`).set({
      type: 'login',
      uid,
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      role: user.role,
      gastronaut: user.gastronaut,
      userDocPath: uid ? `users/${uid}` : null,
      authNote: 'Haslo jest przechowywane w Auth emulatorze; ten dokument istnieje tylko dla wygody dev/test.',
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
  }

  const restaurantRegistry = buildRestaurantRegistry();
  for (const restaurant of restaurantRegistry) {
    const restRef = db.doc(`organizations/${restaurant.orgId}/restaurants/${restaurant.restaurantId}`);
    const [menuCategoriesSnap, menuItemsSnap, bookingsSnap] = await Promise.all([
      restRef.collection('menuCategories').get(),
      restRef.collection('menuItems').get(),
      restRef.collection('bookings').get(),
    ]);
    const promotionsSnap = await db.collection(`organizations/${restaurant.orgId}/promotions`).where('restaurantId', '==', restaurant.restaurantId).get();

    await helperRoot.doc(`restaurant-${restaurant.orgId}-${restaurant.restaurantId}`).set({
      type: 'restaurant-index',
      orgId: restaurant.orgId,
      orgName: restaurant.orgName,
      restaurantId: restaurant.restaurantId,
      restaurantName: restaurant.restaurantName,
      restaurantDocPath: `organizations/${restaurant.orgId}/restaurants/${restaurant.restaurantId}`,
      menuCategoriesPath: `organizations/${restaurant.orgId}/restaurants/${restaurant.restaurantId}/menuCategories`,
      menuItemsPath: `organizations/${restaurant.orgId}/restaurants/${restaurant.restaurantId}/menuItems`,
      bookingsPath: `organizations/${restaurant.orgId}/restaurants/${restaurant.restaurantId}/bookings`,
      promotionsPath: `organizations/${restaurant.orgId}/promotions`,
      menuCategoriesCount: menuCategoriesSnap.size,
      menuItemsCount: menuItemsSnap.size,
      bookingsCount: bookingsSnap.size,
      promotionsCount: promotionsSnap.size,
      source: restaurant.source,
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
  }

  await helperRoot.doc('overview').set({
    type: 'overview',
    note: 'Kolekcja pomocnicza tylko dla emulatora. Wlasciwe menu i rezerwacje sa zapisane jako subkolekcje pod organizations/{orgId}/restaurants/{restaurantId}.',
    loginDocPattern: '_seed/login-{email-slug}',
    restaurantIndexPattern: '_seed/restaurant-{orgId}-{restaurantId}',
    totalLogins: loginUsers.length,
    totalRestaurants: restaurantRegistry.length,
    updatedAt: now,
    createdAt: now,
  }, { merge: true });

  console.log(`✅ Firestore: _seed helper docs (logins=${loginUsers.length}, restaurants=${restaurantRegistry.length})`);
}

/**
 * Writes a _schema/collections document with the full Firestore collection tree.
 * This makes the schema visible in Firebase Console even when collections are empty.
 */
async function seedSchemaMap(now: Timestamp) {
  const schemaRef = db.collection('_schema');

  await schemaRef.doc('collections').set({
    type: 'schema-map',
    version: '1.0',
    note: 'Auto-generated collection tree. Each key is a collection path, value describes the document type and subcollections.',
    tree: {
      'users/{userId}': {
        type: 'UserProfile',
        subcollections: ['memberships', 'loyaltyPoints', 'loyaltyAccounts', 'favoriteRestaurants', 'favoriteMenuItems', 'cv'],
      },
      'users/{userId}/memberships/{orgId}': { type: 'Membership', fields: 'role, pin, permissions, restaurantIds, status' },
      'users/{userId}/loyaltyPoints/{restaurantId}': { type: 'LoyaltyBalance', writtenBy: 'Cloud Function only' },
      'users/{userId}/loyaltyAccounts/{orgId}': { type: 'LoyaltyAccount', writtenBy: 'Cloud Function only' },
      'users/{userId}/favoriteRestaurants/{restaurantId}': { type: 'FavoriteRestaurant' },
      'users/{userId}/favoriteMenuItems/{favoriteId}': { type: 'FavoriteMenuItem' },
      'users/{userId}/cv/{entryId}': { type: 'CvEntry' },

      'organizations/{orgId}': {
        type: 'Organization',
        subcollections: ['members', 'restaurants', 'integrations', 'settings', 'promotions', 'events', 'files', 'logs', 'invites', 'subscriptions', 'invoices'],
      },
      'organizations/{orgId}/members/{memberId}': { type: 'Member (legacy)' },
      'organizations/{orgId}/restaurants/{restaurantId}': {
        type: 'Restaurant',
        subcollections: ['bookings', 'menuCategories', 'menuItems', 'tables', 'sections', 'shifts', 'timeEntries', 'chatMessages', 'todoTasks', 'incidents'],
      },
      'organizations/{orgId}/restaurants/{restaurantId}/bookings/{bookingId}': { type: 'Booking (restaurant-scoped)' },
      'organizations/{orgId}/restaurants/{restaurantId}/menuCategories/{categoryId}': { type: 'MenuCategory' },
      'organizations/{orgId}/restaurants/{restaurantId}/menuItems/{itemId}': { type: 'MenuItem' },
      'organizations/{orgId}/restaurants/{restaurantId}/tables/{tableId}': { type: 'Table' },
      'organizations/{orgId}/restaurants/{restaurantId}/sections/{sectionId}': { type: 'Section' },
      'organizations/{orgId}/restaurants/{restaurantId}/shifts/{shiftId}': { type: 'Shift' },
      'organizations/{orgId}/restaurants/{restaurantId}/timeEntries/{entryId}': { type: 'TimeEntry' },
      'organizations/{orgId}/restaurants/{restaurantId}/chatMessages/{messageId}': { type: 'ChatMessage' },
      'organizations/{orgId}/restaurants/{restaurantId}/todoTasks/{taskId}': { type: 'TodoTask' },
      'organizations/{orgId}/restaurants/{restaurantId}/incidents/{incidentId}': { type: 'Incident' },
      'organizations/{orgId}/integrations/{integrationId}': { type: 'Integration (Drive, Calendar, Workspace)' },
      'organizations/{orgId}/settings/{settingId}': { type: 'OrgSetting' },
      'organizations/{orgId}/promotions/{promotionId}': { type: 'Promotion' },
      'organizations/{orgId}/events/{eventId}': { type: 'Event' },
      'organizations/{orgId}/files/{fileId}': { type: 'BinaryAssetMeta (Drive refs)' },
      'organizations/{orgId}/logs/{logId}': { type: 'AuditLogEntry' },
      'organizations/{orgId}/invites/{inviteId}': { type: 'Invite' },
      'organizations/{orgId}/subscriptions/{subId}': { type: 'Subscription' },
      'organizations/{orgId}/invoices/{invoiceId}': { type: 'Invoice' },

      'bookings/{bookingId}': { type: 'Booking (global, consumer-created)' },
      'activeSessions/{sessionId}': { type: 'SlotZero dine-in session' },
      'notifications/{notificationId}': { type: 'Notification (SOS, alerts)' },
      'loyaltyCards/{cardId}': { type: 'LoyaltyCard' },
      'allergens/{allergenId}': { type: 'Allergen (static reference)' },
      'businessProfiles/{profileId}': { type: 'BusinessProfile (GBP-linked)' },
    },
    collectionGroupIndexes: {
      restaurants: 'Consumer space: map/discover',
      menuItems: 'Consumer space: search/browse',
      memberships: 'PINpad login: PIN lookup across all users',
    },
    updatedAt: now,
    createdAt: now,
  }, { merge: true });

  console.log('✅ Firestore: _schema/collections (schema map)');
}

async function seedAdditionalOrganizationsData(now: Timestamp, uidsByEmail: Record<string, string>, uidsByDisplayName: Record<string, string>) {
  for (const entry of ADDITIONAL_ORGANIZATIONS) {
    const orgRef = db.collection('organizations').doc(entry.organization.id);
    const ownerUid = uidsByEmail[entry.ownerEmails[0] ?? ''] ?? null;

    await orgRef.set({
      ...entry.organization,
      owner: ownerUid,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    const restaurantData = entry.restaurantData;
    const restRef = orgRef.collection('restaurants').doc(restaurantData.restaurant.id);
    await restRef.set({
      ...restaurantData.restaurant,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    await seedOrganizationMembers({
      orgId: entry.organization.id,
      restaurantId: restaurantData.restaurant.id,
      ownerEmails: entry.ownerEmails,
      memberEmails: entry.memberEmails ?? [],
      uidsByEmail,
      now,
    });

    const doCleanupLegacy = (process.env.SEED_CLEAN_LEGACY_VOLATILE ?? 'true') === 'true';
    if (doCleanupLegacy) {
      await cleanupLegacyVolatileSeedDocs(entry.organization.id, restaurantData.restaurant.id);
    }

    const cfg = {
      restaurant: restaurantData.restaurant,
      sections: restaurantData.sections,
      tables: restaurantData.tables,
      menuCategories: restaurantData.menuCategories,
      bookings: restaurantData.bookings,
      shifts: restaurantData.shifts,
      todoTasks: restaurantData.todoTasks,
      ingredients: restaurantData.ingredients,
      recipes: restaurantData.recipes,
    };

    const singleOrgId = entry.organization.id;
    const singleCfg = cfg;

      const sectionsBatch = db.batch();
      for (const s of singleCfg.sections) {
        sectionsBatch.set(restRef.collection('sections').doc(s.id), {
          ...s,
          restaurantId: singleCfg.restaurant.id,
          createdAt: now,
          updatedAt: now,
        });
      }
      await sectionsBatch.commit();

      const tablesBatch = db.batch();
      for (const t of singleCfg.tables) {
        tablesBatch.set(restRef.collection('tables').doc(t.id), {
          ...t,
          restaurantId: singleCfg.restaurant.id,
          createdAt: now,
          updatedAt: now,
        });
      }
      await tablesBatch.commit();

      for (const cat of singleCfg.menuCategories) {
        const categoryId = `cat-${cat.order}-${slugify(cat.name)}`;
        await restRef.collection('menuCategories').doc(categoryId).set({
          id: categoryId,
          name: cat.name,
          order: cat.order,
          visible: true,
          restaurantId: singleCfg.restaurant.id,
          createdAt: now,
          updatedAt: now,
        });

        for (let i = 0; i < cat.items.length; i++) {
          const item = cat.items[i];
          const itemId = buildMenuItemId(cat.order, i + 1, item.name);

          await restRef.collection('menuItems').doc(itemId).set({
            id: itemId,
            categoryId,
            name: item.name,
            description: item.description || null,
            price: item.price,
            basePrice: item.basePrice ?? item.price,
            lowestPriceLast30Days: item.lowestPriceLast30Days ?? item.price,
            currency: singleCfg.restaurant.settings.currency,
            allergens: item.allergens ?? [],
            vegetarian: item.vegetarian ?? false,
            vegan: item.vegan ?? false,
            glutenFree: item.glutenFree ?? false,
            tags: item.tags ?? [],
            weight: item.weight ?? null,
            itemType: item.itemType ?? 'dish',
            macros: item.macros ?? null,
            nutritionSource: item.nutritionSource ?? (item.macros ? 'manual' : null),
            basePrepTime: item.basePrepTime ?? null,
            targetPrepTime: item.targetPrepTime ?? null,
            fiscalization: item.fiscalization ?? null,
            priceHistory: item.priceHistory ?? [],
            available: item.available,
            visible: item.available,
            reactiveHidden: false,
            order: i + 1,
            restaurantId: singleCfg.restaurant.id,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      for (const shift of singleCfg.shifts) {
        const role = toMemberRole(shift.role);
        const shiftId = `${singleCfg.restaurant.id}-shift-${role}-${slugify(shift.displayName)}`;
        const todayStr = isoDateOffset(0);
        const today = new Date();
        const mk = (h: number) => {
          const d = new Date(today);
          d.setHours(h, 0, 0, 0);
          return Timestamp.fromDate(d);
        };
        await restRef.collection('shifts').doc(shiftId).set({
          staffId: uidsByDisplayName[shift.displayName] || null,
          staffName: shift.displayName,
          role,
          restaurantId: singleCfg.restaurant.id,
          date: todayStr,
          scheduledStart: mk(shift.startHour),
          scheduledEnd: mk(shift.endHour),
          actualStart: null,
          actualEnd: null,
          breaks: [],
          status: 'scheduled',
          createdAt: now,
        });
      }

      for (let i = 0; i < singleCfg.todoTasks.length; i++) {
        const task = singleCfg.todoTasks[i];
        const taskId = `${singleCfg.restaurant.id}-todo-${i + 1}`;
        await restRef.collection('todoTasks').doc(taskId).set({
          title: task.title,
          description: task.description || null,
          assignedToRoles: task.assignedToRoles,
          isGroupTask: task.isGroupTask,
          priority: task.priority,
          category: task.category,
          shiftDate: isoDateOffset(0),
          completedBy: null,
          completedAt: null,
          restaurantId: singleCfg.restaurant.id,
          createdAt: now,
        });
      }

      for (let i = 0; i < singleCfg.bookings.length; i++) {
        const booking = singleCfg.bookings[i];
        const bookingId = `${singleCfg.restaurant.id}-booking-${i + 1}-${booking.dayOffset}-${booking.bookingTime.replace(':', '')}`;
        await db.collection('bookings').doc(bookingId).set({
          name: booking.name,
          guestPhone: booking.guestPhone || null,
          guestEmail: booking.guestEmail || null,
          bookingDate: isoDateOffset(booking.dayOffset),
          bookingTime: booking.bookingTime,
          bookingTimeEnd: booking.bookingTimeEnd || null,
          guestCount: booking.guestCount,
          tableId: booking.tableId || null,
          tableNumber: booking.tableNumber || null,
          tableName: booking.tableName || null,
          source: booking.source || 'manual',
          createdByName: booking.createdByName || 'Seed',
          notes: booking.notes || null,
          status: booking.status || 'confirmed',
          restaurantId: singleCfg.restaurant.id,
          organizationId: singleOrgId,
          createdAt: now,
          updatedAt: now,
        });
      }
    console.log(`✅ Additional organization: ${entry.organization.id} (${restaurantData.restaurant.id})`);
  }
}

async function seedIntegrationMetadata(now: Timestamp) {
  const orgId = MASTER_CONFIG.organization.id;
  const primaryVenueId = MASTER_CONFIG.restaurant.id;
  const orgRef = db.doc(`organizations/${orgId}`);

  await orgRef.collection('integrations').doc('googleDrive').set({
    connected: false,
    rootFolderId: process.env.GDRIVE_SEED_FOLDER_ID || null,
    serviceMode: 'metadata-only',
    lastSyncAt: null,
    status: 'not_connected',
    updatedAt: now,
    createdAt: now,
  }, { merge: true });

  await orgRef.collection('integrations').doc('googleBusinessProfile').set({
    connected: false,
    accountId: null,
    locationIds: [],
    hoursSnapshot: null,
    lastSyncAt: null,
    status: 'not_connected',
    updatedAt: now,
    createdAt: now,
  }, { merge: true });

  await orgRef.collection('integrations').doc('googleCalendar').set({
    connected: false,
    calendarId: null,
    lastSyncAt: null,
    status: 'not_connected',
    updatedAt: now,
    createdAt: now,
  }, { merge: true });

  await orgRef.collection('files').doc('sample-menu-image').set({
    googleDriveFileId: 'gdrive-sample-menu-image',
    kind: 'menu-image',
    mimeType: 'image/jpeg',
    size: 123456,
    checksum: 'sha256:sample-menu-image',
    backupStatus: 'pending',
    linkedEntityType: 'menuItem',
    linkedEntityId: 'item-2-1-stek-z-pol-dwicy',
    venueId: primaryVenueId,
    createdBy: 'seed-script',
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  await orgRef.collection('files').doc('sample-invoice').set({
    googleDriveFileId: 'gdrive-sample-invoice',
    kind: 'invoice',
    mimeType: 'application/pdf',
    size: 98765,
    checksum: 'sha256:sample-invoice',
    backupStatus: 'done',
    linkedEntityType: 'supplierInvoice',
    linkedEntityId: 'inv-2026-001',
    venueId: primaryVenueId,
    createdBy: 'seed-script',
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  console.log('✅ Integration metadata (Drive/GBP/Calendar + files)');
}


// Seed active sessions (bills/orders) — global `activeSessions` collection
async function seedActiveSessions(now: Timestamp, uidsByEmail: Record<string, string>) {
  const fallbackUid = uidsByEmail['konsument1@gastroo.dev'] ?? Object.values(uidsByEmail)[0] ?? 'seed-uid';
  const waiterUid = uidsByEmail['kelner@gastroo.dev'] ?? fallbackUid;

  const registry = buildRestaurantRegistry();

  const guestNames = [
    'Jan Kowalski', 'Anna Nowak', 'Piotr Wiśniewski', 'Maria Wójcik',
    'Tomasz Kamiński', 'Katarzyna Lewandowska', 'Marek Zieliński', 'Ewa Szymańska',
    'Adam Woźniak', 'Joanna Dąbrowska', 'Krzysztof Kozłowski', 'Monika Jankowska',
    'Paweł Mazur', 'Agnieszka Krawczyk', 'Michał Piotrowski', 'Dorota Grabowska',
    'Łukasz Nowakowski', 'Barbara Pawłowska', 'Robert Michalski', 'Aleksandra Adamczyk',
    'Jakub Dudek', 'Magdalena Zając', 'Grzegorz Wieczorek', 'Natalia Król',
    'Rafał Mazurek', 'Izabela Stępień', 'Dariusz Jasiński', 'Sylwia Baran',
    'Wojciech Zawadzki', 'Karolina Sadowska', 'Marcin Chmielewski', 'Beata Włodarczyk',
  ];

  // 10 active, 5 payment_pending, 17 closed = 32 total per restaurant
  const statuses: Array<'active' | 'payment_pending' | 'closed'> = [
    'active', 'active', 'active', 'active', 'active',
    'active', 'active', 'active', 'active', 'active',
    'payment_pending', 'payment_pending', 'payment_pending', 'payment_pending', 'payment_pending',
    'closed', 'closed', 'closed', 'closed', 'closed',
    'closed', 'closed', 'closed', 'closed', 'closed',
    'closed', 'closed', 'closed', 'closed', 'closed',
    'closed', 'closed',
  ];
  const itemStatuses: Array<'ordered' | 'preparing' | 'served'> = ['ordered', 'preparing', 'served', 'served', 'served'];

  let globalCounter = 0;

  for (const entry of registry) {
    const config = findRestaurantConfigForOrg(entry.orgId, entry.restaurantId);
    if (!config) continue;

    const allMenuItems: Array<{ name: string; price: number }> = [];
    for (const cat of config.menuCategories) {
      for (const item of cat.items) {
        allMenuItems.push({ name: item.name, price: item.price });
      }
    }
    if (allMenuItems.length === 0) continue;

    const tables = config.tables ?? [];
    const currency = config.restaurant.settings?.currency ?? 'PLN';
    const sessionsCount = statuses.length; // 32

    for (let s = 0; s < sessionsCount; s++) {
      globalCounter++;
      const sessionId = `seed-session-${String(globalCounter).padStart(4, '0')}`;
      const status = statuses[s];
      const guestName = guestNames[s % guestNames.length];
      const table = tables.length > 0 ? tables[s % tables.length] : null;
      const guestCount = 1 + (s % 6);

      // 1–5 items per session
      const itemCount = 1 + (s % 5);
      const sessionItems = [];
      for (let i = 0; i < itemCount; i++) {
        const menuItem = allMenuItems[(s * 3 + i) % allMenuItems.length];
        const itemStatus = status === 'closed' ? 'served' : itemStatuses[(s + i) % itemStatuses.length];
        sessionItems.push({
          id: `sitem_${globalCounter}_${i + 1}`,
          menuItemId: `menu-item-${slugify(menuItem.name)}`,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1 + (i % 2),
          orderedBy: fallbackUid,
          claimedBy: null,
          status: itemStatus,
          createdAt: now,
        });
      }

      const billTotal = sessionItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const paidTotal = status === 'closed' ? billTotal : status === 'payment_pending' ? Math.round(billTotal * 0.5) : 0;

      await db.collection('activeSessions').doc(sessionId).set({
        sessionId,
        organizationId: entry.orgId,
        organizationName: entry.orgName,
        restaurantId: entry.restaurantId,
        restaurantName: entry.restaurantName,
        tableId: table?.id ?? `table-${(s % 5) + 1}`,
        tableNumber: table?.number ?? (s % 5) + 1,
        tableName: table?.name ?? `Stolik ${(s % 5) + 1}`,
        hostId: fallbackUid,
        hostName: guestName,
        guestIds: [fallbackUid],
        guestNames: { [fallbackUid]: guestName },
        guestCount,
        status,
        currency,
        items: sessionItems,
        totals: {
          billTotal,
          paidTotal,
          remainingTotal: billTotal - paidTotal,
          itemCount: sessionItems.length,
        },
        splitMode: 'full_pay',
        payments: status === 'closed' ? [{ method: 'card', amount: billTotal, paidBy: fallbackUid, paidAt: now }] : [],
        openedBy: waiterUid,
        assignedStaffId: waiterUid,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    console.log(`✅ Active sessions seeded: ${sessionsCount}x for ${entry.restaurantId}`);
  }

  console.log(`✅ Total active sessions seeded: ${globalCounter}`);
}

async function seedStorage() {
  const bucket = getStorage(app).bucket(storageBucket);
  await bucket.file('seed/README.txt').save(
    Buffer.from('Gastroo seed (Storage emulator)\n', 'utf8'),
    { contentType: 'text/plain; charset=utf-8' },
  );
  console.log(`✅ Storage: gs://${storageBucket}/seed/README.txt`);
}

async function main() {
  log.banner('Profiled emulator seed');
  log.stage('Preflight');
  const profile = parseSeedProfile();
  log.info(`Unified seed source version: ${UNIFIED_SEED_SOURCE.version}`);
  const now = Timestamp.now();

  console.log(`🌱 Seeding Firebase emulators (profile: ${profile})...`);

  const users = MASTER_CONFIG.users;
  const uidsByEmail = await seedAuthUsers(UNIFIED_SEED_SOURCE.authUsers);
  const uidsByDisplayName = Object.fromEntries(
    users.map((u) => [u.displayName, uidsByEmail[u.email]]),
  );

  await seedCoreData(uidsByEmail, now);

  await seedAdditionalOrganizationsData(now, uidsByEmail, uidsByDisplayName);

  await seedUnassignedUsers(now, uidsByEmail);

  await seedConsumerExperience(now, uidsByEmail);

  await seedActiveSessions(now, uidsByEmail);

  if (profile === 'demo' || profile === 'all') {
    await seedDemoRestaurantData(now, uidsByDisplayName);
  }

  await seedPromotions(now);

  await seedEvents(now);

  await seedEmulatorHelperCollections(now, uidsByEmail);
  await seedSchemaMap(now);

  if (profile === 'integration' || profile === 'all') {
    await seedIntegrationMetadata(now);
  }

  const doStorage = (process.env.SEED_STORAGE ?? 'false') === 'true';
  if (doStorage) {
    await seedStorage();
  } else {
    console.log('⏭️  SEED_STORAGE=false -> pomijam seed Storage');
  }

  console.log('✅ Seed complete.');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
