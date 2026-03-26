/**
 * tests/global-setup.ts
 *
 * Playwright globalSetup – seeduje świeże dane testowe do Firebase Emulator
 * przed uruchomieniem testów. Gwarantuje deterministyczny stan danych niezależnie
 * od snapshotów w emulator-data/.
 *
 * Źródło danych: tests/fixtures/*
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { seedData } from './fixtures';
import { ROLE_PERMISSIONS } from '../src/types/organization';

// ── Połączenie z emulatorami ───────────────────────────────────────────────
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const PROJECT_ID = 'gastroo-4f0a3';

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Pobierz UID istniejącego użytkownika lub stwórz nowego.
 * Nie usuwa/nie odtwarza – zachowuje UID ze snapshotu jeśli user już istnieje.
 */
async function getOrCreateAuthUser(
  auth: Auth,
  user: (typeof seedData.users)[number],
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(user.email);
    // Zaktualizuj displayName / password jeśli trzeba (silent)
    await auth.updateUser(existing.uid, {
      displayName: user.displayName,
      password: user.password,
      emailVerified: true,
    });
    return existing.uid;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
      });
      return created.uid;
    }
    throw e;
  }
}

/**
 * Seed core: org, members, memberships, users docs.
 */
async function seedCore(
  db: Firestore,
  uidsByEmail: Record<string, string>,
  now: Timestamp,
) {
  const org = seedData.organization;
  const restaurantIds = [seedData.restaurant.id];

  // Organization doc
  await db.doc(`organizations/${org.id}`).set({
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    plan: org.plan,
    features: org.features,
    location: org.location ?? null,
    owner: uidsByEmail['admin@gastroo.dev'] ?? null,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  // Restaurant doc
  const rest = seedData.restaurant;
  await db.doc(`organizations/${org.id}/restaurants/${rest.id}`).set({
    ...rest,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  // Members, memberships, users
  for (const u of seedData.users) {
    const uid = uidsByEmail[u.email];
    if (!uid) continue;

    const role = u.role as keyof typeof ROLE_PERMISSIONS;
    const permissions = (ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff) as string[];

    // organizations/{org}/members/{uid}
    await db.doc(`organizations/${org.id}/members/${uid}`).set({
      userId: uid,
      email: u.email,
      displayName: u.displayName,
      role,
      pin: u.pin ?? null,
      restaurantIds,
      permissions,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    }, { merge: true });

    // users/{uid}
    await db.doc(`users/${uid}`).set({
      email: u.email,
      displayName: u.displayName,
      currentOrganizationId: org.id,
      currentRestaurantId: rest.id,
      organizations: [org.id],
      updatedAt: now,
      createdAt: now,
    }, { merge: true });

    // users/{uid}/memberships/{org} — PIN lives here (unique per org)
    await db.doc(`users/${uid}/memberships/${org.id}`).set({
      orgId: org.id,
      role,
      pin: u.pin ?? null,
      permissions,
      restaurantIds,
      venueIds: restaurantIds,
      status: 'active',
      isActive: true,
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
  }
}

/**
 * Seed restaurant data: sections, tables, menuCategories, menuItems, bookings.
 */
async function seedRestaurantData(db: Firestore, now: Timestamp) {
  const org = seedData.organization;
  const rest = seedData.restaurant;
  const restPath = `organizations/${org.id}/restaurants/${rest.id}`;

  // Sections
  const sectionBatch = db.batch();
  for (const s of seedData.sections) {
    sectionBatch.set(db.doc(`${restPath}/sections/${s.id}`), {
      ...s,
      restaurantId: rest.id,
      createdAt: now,
      updatedAt: now,
    });
  }
  await sectionBatch.commit();

  // Tables
  const tableBatch = db.batch();
  for (const t of seedData.tables) {
    tableBatch.set(db.doc(`${restPath}/tables/${t.id}`), {
      ...t,
      restaurantId: rest.id,
      createdAt: now,
      updatedAt: now,
    });
  }
  await tableBatch.commit();

  // Menu categories + items
  for (const cat of seedData.menuCategories) {
    const catId = `cat-${cat.order}-${slugify(cat.name)}`;
    await db.doc(`${restPath}/menuCategories/${catId}`).set({
      id: catId,
      name: cat.name,
      order: cat.order,
      visible: true,
      restaurantId: rest.id,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    const itemBatch = db.batch();
    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i] as {
        name: string;
        description?: string;
        price: number;
        basePrice?: number;
        lowestPriceLast30Days?: number;
        currency?: string;
        allergens?: string[];
        vegetarian?: boolean;
        vegan?: boolean;
        glutenFree?: boolean;
        tags?: string[];
        weight?: unknown;
        itemType?: string;
        macros?: unknown;
        nutritionSource?: string | null;
        basePrepTime?: number;
        targetPrepTime?: number;
        fiscalization?: unknown;
        priceHistory?: unknown[];
        available: boolean;
      };
      const itemId = `item-${cat.order}-${i + 1}-${slugify(item.name)}`;
      itemBatch.set(db.doc(`${restPath}/menuItems/${itemId}`), {
        id: itemId,
        categoryId: catId,
        name: item.name,
        description: item.description ?? null,
        price: item.price,
        basePrice: item.basePrice ?? item.price,
        lowestPriceLast30Days: item.lowestPriceLast30Days ?? item.price,
        currency: rest.settings.currency,
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
        restaurantId: rest.id,
        createdAt: now,
        updatedAt: now,
      });
    }
    await itemBatch.commit();
  }

  // Bookings
  const today = new Date();
  for (const b of seedData.bookings) {
    const bookingDate = new Date(today);
    bookingDate.setDate(bookingDate.getDate() + b.dayOffset);
    const dateStr = bookingDate.toISOString().slice(0, 10);
    const bookingId = `booking-${b.dayOffset}-${(b.bookingTime ?? '0000').replace(':', '')}-${slugify(b.name)}`;

    await db.doc(`${restPath}/bookings/${bookingId}`).set({
      id: bookingId,
      name: b.name,
      guestCount: b.guestCount,
      bookingDate: dateStr,
      bookingTime: b.bookingTime,
      bookingTimeEnd: b.bookingTimeEnd ?? null,
      guestPhone: b.guestPhone ?? null,
      guestEmail: b.guestEmail ?? null,
      notes: b.notes ?? null,
      source: b.source ?? 'manual',
      tableId: b.tableId ?? null,
      tableNumber: b.tableNumber ?? null,
      tableName: b.tableName ?? null,
      createdByName: b.createdByName ?? 'Seed',
      status: b.status ?? 'confirmed',
      restaurantId: rest.id,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }
}

// ── Główna funkcja globalSetup ─────────────────────────────────────────────

export default async function globalSetup() {
  console.log('\n🌱 [global-setup] Seeduję dane testowe do Firebase Emulator...');

  const app = getApps().length ? getApp() : initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const now = Timestamp.now();

  // Krok 1: Auth
  const uidsByEmail: Record<string, string> = {};
  for (const u of seedData.users) {
    const uid = await getOrCreateAuthUser(auth, u);
    uidsByEmail[u.email] = uid;
  }
  console.log(`✅ [global-setup] Auth: ${Object.keys(uidsByEmail).length} użytkowników`);

  // Krok 2: Core (org, members, memberships)
  await seedCore(db, uidsByEmail, now);
  console.log('✅ [global-setup] Core data (org, members, memberships) zapisane');

  // Krok 3: Dane restauracji (sections, tables, menu, bookings)
  await seedRestaurantData(db, now);
  console.log('✅ [global-setup] Dane restauracji (menu, stoliki, rezerwacje) zapisane');

  console.log('✅ [global-setup] Seed zakończony pomyślnie\n');
}
