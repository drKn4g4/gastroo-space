/**
 * POST /api/bookings/create
 * Create a new booking (reservation)
 * Requires: BOOKINGS_CREATE permission OR public endpoint for guest bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { bookingSchema } from '@/lib/validation/bookingSchema';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, hasPermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check: either have permission OR be creating from public form
      const isPublicBooking = !hasPermission(context, 'bookings.create');
      
      if (isPublicBooking && !hasPermission(context, 'bookings.view')) {
        // Public guest booking - more restricted validation
        throw new ApiError('FORBIDDEN', 'Public bookings not allowed', 403);
      }

      // Parse & validate body
      const body = await request.json();
      const validatedData = bookingSchema.parse(body);

      // Get restaurant ID
      const restaurantId = body.restaurantId || context.restaurantId;
      if (!restaurantId) {
        throw new ApiError('BAD_REQUEST', 'restaurantId required', 400);
      }

      // Create booking in global /bookings collection (read by BookingCalendarView)
      const bookingId = `booking-${Date.now()}`;
      await adminDb.doc(`bookings/${bookingId}`).set({
        ...validatedData,
        status: isPublicBooking ? 'pending' : 'confirmed',
        createdBy: context.userId,
        restaurantId,
        organizationId: context.orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        createSuccessResponse({
          id: bookingId,
          ...validatedData,
          status: isPublicBooking ? 'pending' : 'confirmed',
          createdAt: new Date().toISOString(),
        }),
        { status: 201 }
      );
    } catch (error) {
      throw error;
    }
  });
}
