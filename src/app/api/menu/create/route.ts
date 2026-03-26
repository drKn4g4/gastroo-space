/**
 * POST /api/menu/create
 * Create a new menu item
 * Requires: MENU_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { menuItemSchema } from '@/lib/validation/menuSchema';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'menu.manage');

      // Parse & validate body
      const body = await request.json();
      const validatedData = menuItemSchema.parse(body);

      // Get restaurant ID from body or use first accessible restaurant
      const restaurantId = body.restaurantId || context.restaurantId;
      if (!restaurantId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Create menu item in Firestore
      const itemId = `item-${Date.now()}`;
      const itemPath = `organizations/${context.orgId}/restaurants/${restaurantId}/menuItems/${itemId}`;
      await adminDb.doc(itemPath).set({
        ...validatedData,
        restaurantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        createSuccessResponse({
          id: itemId,
          ...validatedData,
          restaurantId,
          createdAt: new Date().toISOString(),
        }),
        { status: 201 }
      );
    } catch (error) {
      throw error;
    }
  });
}
