/**
 * POST /api/members/add
 * Add a new team member to organization
 * Requires: TEAM_MANAGE permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse } from '@/lib/api/errorHandler';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import {
  MEMBER_ROLES,
  PERMISSIONS,
  ROLE_TEMPLATES_BY_KEY,
  type Permission,
  type PermissionOverrides,
} from '@/types/organization';
import { resolveEffectivePermissions } from '@/lib/access/permissions';

export const runtime = 'nodejs';

/** Request schema for adding a team member */
const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(MEMBER_ROLES),
  roleTemplateKey: z
    .string()
    .optional()
    .refine((value) => !value || Boolean(ROLE_TEMPLATES_BY_KEY[value]), {
      message: 'Unknown roleTemplateKey',
    }),
  permissions: z.array(z.string()).optional(),
  permissionOverrides: z
    .object({
      add: z.array(z.string()).optional(),
      remove: z.array(z.string()).optional(),
    })
    .optional(),
  restaurantIds: z.array(z.string()).optional(),
  name: z.string().min(1).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    try {
      // Check permission
      requirePermission(context, PERMISSIONS.MEMBERS_MANAGE);

      // Parse & validate body
      const body = await request.json();
      const validatedData = addMemberSchema.parse(body);

      // Check if user already exists
      let uid: string;
      try {
        const existingUser = await adminAuth.getUserByEmail(validatedData.email);
        uid = existingUser.uid;
      } catch (error: unknown) {
        const authError = error as {code: string | undefined};
        if (authError?.code === 'auth/user-not-found') {
          // Create new user
          const newUser = await adminAuth.createUser({
            email: validatedData.email,
            displayName: validatedData.name,
            emailVerified: false,
          });
          uid = newUser.uid;
        } else {
          throw error;
        }
      }

      // Add member document to Firestore
      const memberId = uid;
      const memberRef = adminDb.doc(
        `organizations/${context.orgId}/members/${memberId}`
      );

      const memberData = {
        userId: uid,
        email: validatedData.email,
        name: validatedData.name || validatedData.email.split('@')[0],
        role: validatedData.role,
        roleTemplateKey: validatedData.roleTemplateKey,
        restaurantIds: validatedData.restaurantIds || [],
        status: 'active' as const,
        joinedAt: new Date(),
        updatedAt: new Date(),
        invitedBy: context.userId,
        permissions: resolveEffectivePermissions({
          role: validatedData.role,
          roleTemplateKey: validatedData.roleTemplateKey,
          explicitPermissions: validatedData.permissions,
          permissionOverrides: validatedData.permissionOverrides as PermissionOverrides | undefined,
        }) as Permission[],
        permissionOverrides: validatedData.permissionOverrides,
      };

      await memberRef.set(memberData);

      const membershipRef = adminDb.doc(`users/${uid}/memberships/${context.orgId}`);
      await membershipRef.set({
        orgId: context.orgId,
        role: validatedData.role,
        roleTemplateKey: validatedData.roleTemplateKey,
        permissions: memberData.permissions,
        permissionOverrides: validatedData.permissionOverrides,
        restaurantIds: memberData.restaurantIds,
        venueIds: memberData.restaurantIds,
        status: memberData.status,
        isActive: memberData.status === 'active',
        updatedAt: new Date(),
        createdAt: new Date(),
      }, { merge: true });

      // Update user's organization membership in user profile
      try {
        const userDoc = await adminDb.doc(`users/${uid}`).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const organizations = userData?.organizations || [];
          if (!organizations.includes(context.orgId)) {
            organizations.push(context.orgId);
          }
          await adminDb.doc(`users/${uid}`).update({
            organizations,
            updatedAt: new Date(),
          });
        } else {
          throw new Error('User profile does not exist');
        }
      } catch {
        // User profile doesn't exist yet, create it
        await adminDb.doc(`users/${uid}`).set({
          email: validatedData.email,
          organizations: [context.orgId],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return NextResponse.json(
        createSuccessResponse({
          id: memberId,
          ...memberData,
          createdAt: new Date().toISOString(),
        }),
        { status: 201 }
      );
    } catch (error) {
      throw error;
    }
  });
}
