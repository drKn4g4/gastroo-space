/**
 * GET /api/bookings/list
 * List all bookings for a restaurant
 * Requires: BOOKINGS_VIEW permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'bookings.view');

      // Get parameters from URL query
      const { searchParams } = new URL(request.url);
      const restaurantId = searchParams.get('restaurantId') || context.restaurantId;
      const status = searchParams.get('status'); // Optional filter: 'confirmed', 'pending', 'cancelled'
      const fromDate = searchParams.get('fromDate'); // ISO date string
      const toDate = searchParams.get('toDate'); // ISO date string
      const limit = parseInt(searchParams.get('limit') || '50', 10);

      if (!restaurantId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Build query against global /bookings collection
      let query = adminDb.collection('bookings')
        .where('organizationId', '==', context.orgId)
        .where('restaurantId', '==', restaurantId) as any;

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }

      if (fromDate) {
        query = query.where('bookingDate', '>=', fromDate);
      }

      if (toDate) {
        query = query.where('bookingDate', '<=', toDate);
      }

      // Limit results
      query = query.limit(limit);

      // Execute query
      const snapshot = await query.get();

      const bookings = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json(
        createSuccessResponse({
          bookings,
          count: bookings.length,
          restaurantId,
        }),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}
