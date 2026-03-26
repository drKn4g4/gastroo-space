/**
 * POST /api/bookings/cancel
 * Cancel a booking
 * Requires: BOOKINGS_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'bookings.manage');

      // Parse body
      const body = await request.json();
      const { bookingId, restaurantId, reason } = body;

      if (!bookingId) {
        throw new ApiError('BAD_REQUEST', 'bookingId is required', 400);
      }

      const restoId = restaurantId || context.restaurantId;
      if (!restoId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Get existing booking from global /bookings collection
      const bookingPath = `bookings/${bookingId}`;
      const bookingDoc = await adminDb.doc(bookingPath).get();

      if (!bookingDoc.exists) {
        throw new ApiError('NOT_FOUND', 'Booking not found', 404);
      }

      const existingBooking = bookingDoc.data();

      // Check if already cancelled
      if (existingBooking?.status === 'cancelled') {
        throw new ApiError('BAD_REQUEST', 'Booking is already cancelled', 400);
      }

      // Update booking status to cancelled
      await adminDb.doc(bookingPath).update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason || null,
        updatedAt: new Date(),
      });

      // Return updated booking
      const updatedBooking = await adminDb.doc(bookingPath).get();

      return NextResponse.json(
        createSuccessResponse({
          ...updatedBooking.data(),
          message: 'Booking cancelled successfully',
        }),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}
