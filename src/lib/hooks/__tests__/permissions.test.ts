import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS, MemberRole } from '@/types/organization';

/**
 * Unit tests for RBAC permission definitions.
 * These tests verify the business rules without any Firebase connection.
 */

function can(role: MemberRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission as never) ?? false;
}

describe('ROLE_PERMISSIONS — Kelner (waiter)', () => {
  it('can view bookings', () => expect(can('waiter', PERMISSIONS.BOOKINGS_VIEW)).toBe(true));
  it('can create bookings', () => expect(can('waiter', PERMISSIONS.BOOKINGS_CREATE)).toBe(true));
  it('can edit bookings', () => expect(can('waiter', PERMISSIONS.BOOKINGS_UPDATE)).toBe(true));
  it('can delete bookings', () => expect(can('waiter', PERMISSIONS.BOOKINGS_DELETE)).toBe(true));
  it('can view menu', () => expect(can('waiter', PERMISSIONS.MENU_VIEW)).toBe(true));
  it('cannot manage menu', () => expect(can('waiter', PERMISSIONS.MENU_MANAGE)).toBe(false));
  it('cannot manage staff', () => expect(can('waiter', PERMISSIONS.STAFF_MANAGE)).toBe(false));
  it('cannot access settings', () => expect(can('waiter', PERMISSIONS.SETTINGS_MANAGE)).toBe(false));
});

describe('ROLE_PERMISSIONS — Kucharz (chef)', () => {
  it('can view menu', () => expect(can('chef', PERMISSIONS.MENU_VIEW)).toBe(true));
  it('can manage menu', () => expect(can('chef', PERMISSIONS.MENU_MANAGE)).toBe(true));
  it('can view bookings (read-only)', () => expect(can('chef', PERMISSIONS.BOOKINGS_VIEW)).toBe(true));
  it('cannot create bookings', () => expect(can('chef', PERMISSIONS.BOOKINGS_CREATE)).toBe(false));
  it('cannot edit bookings', () => expect(can('chef', PERMISSIONS.BOOKINGS_UPDATE)).toBe(false));
  it('cannot delete bookings', () => expect(can('chef', PERMISSIONS.BOOKINGS_DELETE)).toBe(false));
  it('cannot manage staff', () => expect(can('chef', PERMISSIONS.STAFF_MANAGE)).toBe(false));
  it('cannot access settings', () => expect(can('chef', PERMISSIONS.SETTINGS_MANAGE)).toBe(false));
});

describe('ROLE_PERMISSIONS — Manager', () => {
  it('can manage bookings (full CRUD)', () => {
    expect(can('manager', PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    expect(can('manager', PERMISSIONS.BOOKINGS_CREATE)).toBe(true);
    expect(can('manager', PERMISSIONS.BOOKINGS_UPDATE)).toBe(true);
    expect(can('manager', PERMISSIONS.BOOKINGS_DELETE)).toBe(true);
  });

  it('can manage menu', () => {
    expect(can('manager', PERMISSIONS.MENU_VIEW)).toBe(true);
    expect(can('manager', PERMISSIONS.MENU_MANAGE)).toBe(true);
  });

  it('can view and manage staff', () => {
    expect(can('manager', PERMISSIONS.STAFF_VIEW)).toBe(true);
    expect(can('manager', PERMISSIONS.STAFF_MANAGE)).toBe(true);
  });

  it('can manage settings', () => {
    expect(can('manager', PERMISSIONS.SETTINGS_VIEW)).toBe(true);
    expect(can('manager', PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
  });
});

describe('ROLE_PERMISSIONS — Admin', () => {
  it('has all permissions', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(can('admin', permission)).toBe(true);
    }
  });
});

describe('ROLE_PERMISSIONS — Owner', () => {
  it('has all permissions', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(can('owner', permission)).toBe(true);
    }
  });
});

describe('RBAC business rules', () => {
  it('waiter and chef have disjoint booking write permissions', () => {
    // waiter can edit, chef cannot
    expect(can('waiter', PERMISSIONS.BOOKINGS_UPDATE)).toBe(true);
    expect(can('chef', PERMISSIONS.BOOKINGS_UPDATE)).toBe(false);
  });

  it('chef and waiter have disjoint menu management', () => {
    // chef can manage menu, waiter cannot
    expect(can('chef', PERMISSIONS.MENU_MANAGE)).toBe(true);
    expect(can('waiter', PERMISSIONS.MENU_MANAGE)).toBe(false);
  });

  it('all defined roles have a permission array', () => {
    const roles: MemberRole[] = ['owner', 'admin', 'manager', 'waiter', 'chef', 'staff'];
    for (const role of roles) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });
});
