/**
 * Shared seed utilities for tests and setup
 * Provides reusable functions for creating test data
 */

import * as admin from 'firebase-admin';

export interface OrganizationData {
  name: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  plan: 'starter' | 'pro' | 'enterprise';
}

export interface RestaurantData {
  name: string;
  address: string;
  phone: string;
  tableCount: number;
}

export interface TableData {
  number: number;
  name: string;
  capacity: number;
  location: string;
}

export interface MenuItemData {
  name: string;
  price: number;
  allergens: string[];
  dietary: {
    vegan: boolean;
    vegetarian: boolean;
    glutenFree: boolean;
  };
  visible: boolean;
}

export interface BookingData {
  guestName: string;
  guestPhone: string;
  guestCount: number;
  date: string;
  time: string;
}

export class SeedHelper {
  constructor(private adminDb: admin.firestore.Firestore) {}

  /**
   * Create an organization with owner
   */
  async createOrganization(
    orgData: OrganizationData,
    adminAuth?: admin.auth.Auth
  ): Promise<string> {
    const orgId = `org-${Date.now()}`;

    // Create or verify owner user if adminAuth provided
    if (adminAuth) {
      try {
        await adminAuth.getUserByEmail(orgData.ownerEmail);
      } catch (error: unknown) {
        const authError = error as {code?: string};
        if (authError?.code === 'auth/user-not-found') {
          await adminAuth.createUser({
            email: orgData.ownerEmail,
            password: 'TestPassword123!',
            emailVerified: true,
          });
        }
      }
    }

    // Create organization
    await this.adminDb.doc(`organizations/${orgId}`).set({
      ...orgData,
      features: {
        loyaltyProgram: true,
        onlineOrdering: true,
        tableManagement: true,
        analytics: true,
        integrations: true,
      },
      settings: {
        language: 'pl',
        currency: 'PLN',
        timezone: 'Europe/Warsaw',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return orgId;
  }

  /**
   * Add member to organization
   */
  async addMember(
    orgId: string,
    userId: string,
    email: string,
    role: 'owner' | 'manager' | 'staff',
    restaurantIds: string[] = [],
    adminAuth?: admin.auth.Auth
  ): Promise<void> {
    // Create user if adminAuth provided and doesn't exist
    if (adminAuth) {
      try {
        await adminAuth.getUserByEmail(email);
      } catch (error: unknown) {
        const authError = error as {code?: string};
        if (authError?.code === 'auth/user-not-found') {
          const created = await adminAuth.createUser({
            email,
            password: 'TestPassword123!',
            emailVerified: true,
          });
          userId = created.uid;
        }
      }
    }

    const permissions = this.getPermissionsForRole(role);

    // Add to members collection
    await this.adminDb.doc(`organizations/${orgId}/members/${userId}`).set({
      userId,
      email,
      role,
      restaurantIds,
      status: 'active',
      joinedAt: new Date(),
      updatedAt: new Date(),
      permissions,
    });

    // Update user profile
    await this.adminDb.doc(`users/${userId}`).set(
      {
        organizations: admin.firestore.FieldValue.arrayUnion([orgId]),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  /**
   * Create restaurant in organization
   */
  async createRestaurant(
    orgId: string,
    restaurantData: RestaurantData
  ): Promise<string> {
    const restaurantId = `rest-${Date.now()}`;

    await this.adminDb
      .doc(`organizations/${orgId}/restaurants/${restaurantId}`)
      .set({
        ...restaurantData,
        hours: {
          monday: { open: '11:00', close: '23:00' },
          tuesday: { open: '11:00', close: '23:00' },
          wednesday: { open: '11:00', close: '23:00' },
          thursday: { open: '11:00', close: '23:00' },
          friday: { open: '10:00', close: '00:00' },
          saturday: { open: '10:00', close: '00:00' },
          sunday: { open: '12:00', close: '22:00' },
        },
        settings: {
          requiresReservation: true,
          minPartySize: 2,
          maxPartySize: 12,
          cancellationTime: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return restaurantId;
  }

  /**
   * Create table in restaurant
   */
  async createTable(
    orgId: string,
    restaurantId: string,
    tableData: TableData
  ): Promise<string> {
    const tableId = `table-${Date.now()}`;

    await this.adminDb
      .doc(
        `organizations/${orgId}/restaurants/${restaurantId}/tables/${tableId}`
      )
      .set({
        ...tableData,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return tableId;
  }

  /**
   * Create menu category
   */
  async createMenuCategory(
    orgId: string,
    restaurantId: string,
    name: string,
    sortOrder: number
  ): Promise<string> {
    const categoryId = `cat-${Date.now()}`;

    await this.adminDb
      .doc(
        `organizations/${orgId}/restaurants/${restaurantId}/menuCategories/${categoryId}`
      )
      .set({
        name,
        sortOrder,
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return categoryId;
  }

  /**
   * Create menu item
   */
  async createMenuItem(
    orgId: string,
    restaurantId: string,
    categoryId: string,
    itemData: MenuItemData
  ): Promise<string> {
    const itemId = `item-${Date.now()}`;

    await this.adminDb
      .doc(
        `organizations/${orgId}/restaurants/${restaurantId}/menuItems/${itemId}`
      )
      .set({
        ...itemData,
        categoryId,
        portions: [
          {
            name: 'Single',
            price: itemData.price,
            items: 1,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return itemId;
  }

  /**
   * Create booking
   */
  async createBooking(
    orgId: string,
    restaurantId: string,
    tableId: string,
    bookingData: BookingData
  ): Promise<string> {
    const bookingId = `booking-${Date.now()}`;

    await this.adminDb
      .doc(
        `organizations/${orgId}/restaurants/${restaurantId}/bookings/${bookingId}`
      )
      .set({
        ...bookingData,
        tableId,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return bookingId;
  }

  /**
   * Delete organization and all subcollections (be careful!)
   */
  async deleteOrganization(orgId: string): Promise<void> {
    const orgRef = this.adminDb.collection('organizations').doc(orgId);

    // Get all restaurants
    const restaurants = await orgRef.collection('restaurants').listDocuments();

    // Delete restaurants and their subcollections
    for (const rest of restaurants) {
      const tables = await rest.collection('tables').listDocuments();
      const menus = await rest.collection('menuItems').listDocuments();
      const bookings = await rest.collection('bookings').listDocuments();

      for (const doc of [...tables, ...menus, ...bookings]) {
        await doc.delete();
      }

      await rest.delete();
    }

    // Delete members
    const members = await orgRef.collection('members').listDocuments();
    for (const member of members) {
      await member.delete();
    }

    // Delete organization
    await orgRef.delete();
  }

  /**
   * Get permissions for role
   */
  private getPermissionsForRole(role: 'owner' | 'manager' | 'staff'): string[] {
    const basePermissions = [
      'restaurants.view',
      'menu.view',
      'bookings.view',
      'orders.view',
    ];

    const managerPermissions = [
      ...basePermissions,
      'menu.manage',
      'bookings.create',
      'bookings.manage',
      'orders.manage',
      'tables.view',
      'tables.manage',
      'reports.view',
    ];

    const ownerPermissions = [
      ...managerPermissions,
      'team.manage',
      'team.invite',
      'organization.manage',
      'settings.manage',
      'integrations.manage',
      'reports.manage',
    ];

    switch (role) {
      case 'owner':
        return ownerPermissions;
      case 'manager':
        return managerPermissions;
      case 'staff':
        return basePermissions;
    }
  }
}

/**
 * Factory function to create SeedHelper with admin SDK
 */
export function createSeedHelper(
  adminDb?: admin.firestore.Firestore
): SeedHelper {
  return new SeedHelper(
    adminDb || admin.firestore()
  );
}
