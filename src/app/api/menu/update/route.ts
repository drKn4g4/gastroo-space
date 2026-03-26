/**
 * PATCH /api/menu/update
 * Update an existing menu item
 * Requires: MENU_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { menuItemSchema } from '@/lib/validation/menuSchema';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'menu.manage');

      // Parse & validate body
      const body = await request.json();
      const { itemId, restaurantId, ...updateData } = body;

      if (!itemId) {
        throw new ApiError('BAD_REQUEST', 'itemId is required', 400);
      }

      const restoId = restaurantId || context.restaurantId;
      if (!restoId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Validate update data (partial schema)
      const validatedData = menuItemSchema.partial().parse(updateData);

      // Get existing item to verify it exists and belongs to the organization
      const itemPath = `organizations/${context.orgId}/restaurants/${restoId}/menuItems/${itemId}`;
      const itemDoc = await adminDb.doc(itemPath).get();

      if (!itemDoc.exists) {
        throw new ApiError('NOT_FOUND', 'Menu item not found', 404);
      }

      // Update menu item in Firestore
      await adminDb.doc(itemPath).update({
        ...validatedData,
        updatedAt: new Date(),
      });

      // Return updated item
      const updatedItem = await adminDb.doc(itemPath).get();

      return NextResponse.json(
        createSuccessResponse(updatedItem.data()),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}
