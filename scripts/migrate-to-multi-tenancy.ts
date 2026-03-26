/**
 * Migration script: Convert existing data to multi-tenancy structure
 * Run with: npx ts-node scripts/migrate-to-multi-tenancy.ts
 *
 * WARNING: This is a one-way migration. Back up your Firestore data first!
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ROLE_PERMISSIONS } from '../src/types/organization';
import { createNodeLogger, installConsoleDecorators } from './helpers/node-logger.mjs';

installConsoleDecorators('migrate-multi-tenancy');
const log = createNodeLogger('migrate-multi-tenancy');

const app = initializeApp();
const db = getFirestore(app);

async function migrateToMultiTenancy() {
  log.banner('Starting migration to multi-tenancy');

  // Step 1: Get all users with business profiles
  log.stage('Discovery i migracja danych');
  console.log('Step 1: Finding users with business profiles...');
  const businessProfilesSnapshot = await db.collection('businessProfiles').get();
  console.log(`Found ${businessProfilesSnapshot.size} business profiles\n`);

  for (const profileDoc of businessProfilesSnapshot.docs) {
    const profile = profileDoc.data();
    const userId = profile.userId;

    console.log(`\nMigrating user: ${userId}`);
    console.log(`Business profile: ${profile.name || 'Unnamed'}`);

    try {
      // Step 2: Create organization
      const orgRef = db.collection('organizations').doc();
      const orgName = profile.name || 'My Restaurant';
      const orgSlug = generateSlug(orgName);

      await orgRef.set({
        name: orgName,
        slug: orgSlug,
        type: 'single_location',
        plan: 'free',
        features: [],
        owner: userId,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`✓ Created organization: ${orgRef.id}`);

      // Step 3: Create restaurant under organization
      const restaurantRef = db.collection(`organizations/${orgRef.id}/restaurants`).doc();
      await restaurantRef.set({
        name: profile.name || 'Main Restaurant',
        address: {
          street: profile.address || '',
          city: profile.city || '',
          postalCode: profile.postalCode || '',
          country: profile.country || 'Poland',
        },
        phone: profile.phone || '',
        timezone: 'Europe/Warsaw',
        settings: {
          currency: 'PLN',
          language: 'pl',
          bookingDuration: 90,
        },
        gbpConnected: profile.gbpConnected || false,
        gbpLocationId: profile.gbpLocationId || null,
        gbpAccessToken: profile.gbpAccessToken || null,
        gbpRefreshToken: profile.gbpRefreshToken || null,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`✓ Created restaurant: ${restaurantRef.id}`);

      // Step 4: Create owner member
      await db.doc(`organizations/${orgRef.id}/members/${userId}`).set({
        userId: userId,
        role: 'owner',
        restaurantIds: [restaurantRef.id],
        permissions: ROLE_PERMISSIONS.owner,
        joinedAt: FieldValue.serverTimestamp(),
      });
      console.log(`✓ Created owner member for user: ${userId}`);

      // Step 5: Migrate bookings from legacy collection
      console.log('Migrating bookings...');
      const userBookings = await db.collection('bookings')
        .where('userId', '==', userId)
        .get();

      if (!userBookings.empty) {
        const batch = db.batch();
        let bookingCount = 0;

        for (const bookingDoc of userBookings.docs) {
          const bookingData = bookingDoc.data();
          const newBookingRef = db.doc(`organizations/${orgRef.id}/restaurants/${restaurantRef.id}/bookings/${bookingDoc.id}`);

          batch.set(newBookingRef, {
            ...bookingData,
            source: 'manual',
            status: bookingData.status || 'confirmed',
            migratedAt: FieldValue.serverTimestamp(),
          });
          bookingCount++;
        }

        await batch.commit();
        console.log(`✓ Migrated ${bookingCount} bookings`);
      } else {
        console.log('No bookings to migrate');
      }

      // Step 6: Update user document
      await db.doc(`users/${userId}`).set({
        currentOrganizationId: orgRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`✓ Updated user document with currentOrganizationId`);

      console.log(`✓ Migration complete for user: ${userId}\n`);

    } catch (error) {
      console.error(`✗ Error migrating user ${userId}:`, error);
    }
  }

  console.log('\n🎉 Migration completed!');
  console.log('\nNext steps:');
  console.log('1. Verify data in Firebase Console');
  console.log('2. Test login and organization access');
  console.log('3. Deploy new Firestore rules: firebase deploy --only firestore:rules');
  console.log('4. (Optional) Archive legacy collections if everything works\n');

  process.exit(0);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

migrateToMultiTenancy().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
