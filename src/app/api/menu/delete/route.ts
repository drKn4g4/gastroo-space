/**
 * DELETE /api/menu/delete
 * Delete a menu item
 * Requires: MENU_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'menu.manage');

      // Get parameters from URL query
      const { searchParams } = new URL(request.url);
      const itemId = searchParams.get('itemId');
      const restaurantId = searchParams.get('restaurantId') || context.restaurantId;

      if (!itemId) {
        throw new ApiError('BAD_REQUEST', 'itemId is required', 400);
      }

      if (!restaurantId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Get existing item to verify it exists and belongs to the organization
      const itemPath = `organizations/${context.orgId}/restaurants/${restaurantId}/menuItems/${itemId}`;
      const itemDoc = await adminDb.doc(itemPath).get();

      if (!itemDoc.exists) {
        throw new ApiError('NOT_FOUND', 'Menu item not found', 404);
      }

      // Delete menu item from Firestore
      await adminDb.doc(itemPath).delete();

      return NextResponse.json(
        createSuccessResponse({
          id: itemId,
          deleted: true,
        }),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}
