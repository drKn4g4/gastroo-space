/**
 * API Authentication Middleware
 * Verifies Firebase ID token and extracts user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { ApiError } from './errorHandler';

export interface AuthContext {
  userId: string;
  email?: string;
  orgId: string;
  restaurantId?: string;
  role: string;
  permissions: string[];
}

/**
 * Extract Firebase ID token from Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

/**
 * Verify Firebase ID token and extract user claims
 */
export async function verifyAuth(token: string): Promise<{ uid: string; email?: string; customClaims: Record<string, any> }> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      customClaims: decodedToken,
    };
  } catch (error) {
    throw new ApiError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}

/**
 * Get user's organization and role context
 */
export async function getUserContext(userId: string, orgId: string): Promise<AuthContext> {
  try {
    const orgDoc = await adminDb.doc(`organizations/${orgId}`).get();
    if (!orgDoc.exists) {
      // Avoid leaking organization existence through 404 on authenticated calls.
      throw new ApiError('FORBIDDEN', 'User is not allowed to access this organization', 403);
    }

    const [memberDoc, membershipDoc] = await Promise.all([
      adminDb.doc(`organizations/${orgId}/members/${userId}`).get(),
      adminDb.doc(`users/${userId}/memberships/${orgId}`).get(),
    ]);

    if (!memberDoc.exists && !membershipDoc.exists) {
      throw new ApiError('FORBIDDEN', 'User is not a member of this organization', 403);
    }

    const memberData = memberDoc.data() ?? {};
    const membershipData = membershipDoc.data() ?? {};
    const sourceData = membershipDoc.exists ? membershipData : memberData;
    const orgData = orgDoc.data() || {};
    const membershipRole = sourceData.role || memberData.role || 'guest';
    const membershipPermissions = sourceData.permissions || memberData.permissions || [];
    const restaurantId = sourceData.currentRestaurantId || memberData.currentRestaurantId;

    return {
      userId,
      orgId,
      role: membershipRole,
      permissions: membershipPermissions,
      restaurantId,
      email: orgData.ownerEmail,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('INTERNAL_ERROR', 'Failed to fetch user context', 500);
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     return withAuth(request, async (context) => {
 *       // Your endpoint logic
 *     });
 *   }
 */
export async function withAuth(
  request: NextRequest,
  handler: (context: AuthContext) => Promise<any>
): Promise<NextResponse> {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' } },
        { status: 401 }
      );
    }

    const decoded = await verifyAuth(token);

    // Get organization ID from request (can be query param or body)
    let orgId: string | null = null;
    
    // Try to get from query params
    const url = new URL(request.url);
    orgId = url.searchParams.get('orgId');

    // Try to get from request body (clone first so handler can re-read)
    if (!orgId && request.method !== 'GET') {
      try {
        const cloned = request.clone();
        const body = await cloned.json();
        orgId = body.orgId;
      } catch {
        // Not JSON body
      }
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing orgId' } },
        { status: 400 }
      );
    }

    // Get user context
    const context = await getUserContext(decoded.uid, orgId);

    // Call handler with context
    const result = await handler(context);
    return result instanceof NextResponse ? result : NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(context: AuthContext, requiredPermission: string): boolean {
  return context.permissions.includes(requiredPermission);
}

/**
 * Require specific permission or throw error
 */
export function requirePermission(context: AuthContext, requiredPermission: string): void {
  if (!hasPermission(context, requiredPermission)) {
    throw new ApiError(
      'FORBIDDEN',
      `Missing required permission: ${requiredPermission}`,
      403
    );
  }
}
