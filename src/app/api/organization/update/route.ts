/**
 * PATCH /api/organization/update
 * Update organization settings
 * Requires: ORGANIZATION_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, 'organization.manage');

      // Parse & validate only the fields being updated
      const body = await request.json();
      
      // Use partial schema or validate specific fields
      const updateFields: Record<string, string | object | Record<string, string | boolean>> = {};

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.length < 1) {
          throw new ApiError('BAD_REQUEST', 'name must be non-empty string', 400);
        }
        updateFields.name = body.name;
      }

      if (body.timezone !== undefined) {
        if (typeof body.timezone !== 'string') {
          throw new ApiError('BAD_REQUEST', 'timezone must be string', 400);
        }
        updateFields.timezone = body.timezone;
      }

      if (body.features !== undefined) {
        if (typeof body.features !== 'object') {
          throw new ApiError('BAD_REQUEST', 'features must be object', 400);
        }
        updateFields.features = body.features;
      }

      if (body.settings !== undefined) {
        if (typeof body.settings !== 'object') {
          throw new ApiError('BAD_REQUEST', 'settings must be object', 400);
        }
        updateFields.settings = body.settings;
      }

      if (Object.keys(updateFields).length === 0) {
        throw new ApiError('BAD_REQUEST', 'no valid fields to update', 400);
      }

      // Fetch current organization
      const orgDoc = await adminDb.doc(`organizations/${context.orgId}`).get();
      
      if (!orgDoc.exists) {
        throw new ApiError('NOT_FOUND', 'organization not found', 404);
      }

      const currentOrg = orgDoc.data();

      // Update Firestore
      await adminDb.doc(`organizations/${context.orgId}`).update({
        ...updateFields,
        updatedAt: new Date(),
      });

      // Return updated organization
      const updatedOrg = {
        id: context.orgId,
        ...currentOrg,
        ...updateFields,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json(
        createSuccessResponse(updatedOrg),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission - read-only
      requirePermission(context, 'organization.view');

      // Fetch organization
      const orgDoc = await adminDb.doc(`organizations/${context.orgId}`).get();
      
      if (!orgDoc.exists) {
        throw new ApiError('NOT_FOUND', 'organization not found', 404);
      }

      const org = orgDoc.data();

      return NextResponse.json(
        createSuccessResponse({
          id: context.orgId,
          ...org,
        }),
        { status: 200 }
      );
    } catch (error) {
      throw error;
    }
  });
}
