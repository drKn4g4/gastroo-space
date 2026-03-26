import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/organization';

const requirePermissionMock = vi.fn();
const withAuthMock = vi.fn();

const memberSetMock = vi.fn();
const membershipSetMock = vi.fn();
const userUpdateMock = vi.fn();
const userSetMock = vi.fn();
const getUserByEmailMock = vi.fn();
const createUserMock = vi.fn();

let userDocExists = true;

vi.mock('@/lib/api/auth', () => ({
  withAuth: withAuthMock,
  requirePermission: requirePermissionMock,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    getUserByEmail: getUserByEmailMock,
    createUser: createUserMock,
  },
  adminDb: {
    doc: vi.fn((path: string) => {
      if (path.includes('/memberships/')) {
        return {
          set: membershipSetMock,
        };
      }

      if (path.startsWith('organizations/')) {
        return {
          set: memberSetMock,
        };
      }

      if (path.startsWith('users/')) {
        return {
          get: vi.fn(async () => {
            if (userDocExists) {
              return {
                exists: true,
                data: () => ({ organizations: ['org-0'] }),
              };
            }

            return {
              exists: false,
              data: () => undefined,
            };
          }),
          update: userUpdateMock,
          set: userSetMock,
        };
      }

      return {
        set: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
      };
    }),
  },
}));

describe('POST /api/members/add', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userDocExists = true;

    withAuthMock.mockImplementation(async (_request: NextRequest, handler: (context: any) => Promise<Response>) => {
      return handler({
        userId: 'owner-1',
        orgId: 'org-1',
        role: 'owner',
        permissions: [PERMISSIONS.MEMBERS_MANAGE],
      });
    });

    getUserByEmailMock.mockResolvedValue({ uid: 'existing-user-1' });
    createUserMock.mockResolvedValue({ uid: 'created-user-1' });
  });

  it('requires members.manage and dual-writes member + membership documents', async () => {
    const { POST } = await import('../route');

    const request = new NextRequest('http://localhost:5202/api/members/add', {
      method: 'POST',
      body: JSON.stringify({
        email: 'new.staff@gastroo.dev',
        role: 'staff',
        restaurantIds: ['r-1'],
        name: 'Nowy Staff',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    expect(requirePermissionMock).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.MEMBERS_MANAGE,
    );

    expect(memberSetMock).toHaveBeenCalledTimes(1);
    expect(membershipSetMock).toHaveBeenCalledTimes(1);

    const membershipPayload = membershipSetMock.mock.calls[0][0];
    expect(membershipPayload).toMatchObject({
      orgId: 'org-1',
      role: 'staff',
      restaurantIds: ['r-1'],
      venueIds: ['r-1'],
      status: 'active',
      isActive: true,
    });

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('staff');
  });

  it('creates Firebase user when email does not exist', async () => {
    const { POST } = await import('../route');

    getUserByEmailMock.mockRejectedValue({ code: 'auth/user-not-found' });
    userDocExists = false;

    const request = new NextRequest('http://localhost:5202/api/members/add', {
      method: 'POST',
      body: JSON.stringify({
        email: 'brand.new@gastroo.dev',
        role: 'manager',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'brand.new@gastroo.dev',
      }),
    );
    expect(userSetMock).toHaveBeenCalledTimes(1);
  });
});
