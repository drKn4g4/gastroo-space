/**
 * PATCH /api/bookings/update
 * Update an existing booking (status, date, guest info, etc)
 * Requires: BOOKINGS_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { bookingSchema } from '@/lib/validation/bookingSchema';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'bookings.manage');

      // Parse & validate body
      const body = await request.json();
      const { bookingId, restaurantId, ...updateData } = body;

      if (!bookingId) {
        throw new ApiError('BAD_REQUEST', 'bookingId is required', 400);
      }

      const restoId = restaurantId || context.restaurantId;
      if (!restoId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Validate update data (partial schema)
      const validatedData = bookingSchema.partial().parse(updateData);

      // Get existing booking from global /bookings collection
      const bookingPath = `bookings/${bookingId}`;
      const bookingDoc = await adminDb.doc(bookingPath).get();

      if (!bookingDoc.exists) {
        throw new ApiError('NOT_FOUND', 'Booking not found', 404);
      }

      // Update booking in Firestore
      await adminDb.doc(bookingPath).update({
        ...validatedData,
        updatedAt: new Date(),
      });

      // Return updated booking
      const updatedBooking = await adminDb.doc(bookingPath).get();

      return NextResponse.json(
        createSuccessResponse(updatedBooking.data()),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}
