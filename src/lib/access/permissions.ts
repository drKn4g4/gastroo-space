import {
  ROLE_PERMISSIONS,
  ROLE_TEMPLATES_BY_KEY,
  type MemberRole,
  type Permission,
  type PermissionOverrides,
} from '@/types/organization';

export interface OrgRoleOverrides {
  add?: string[];
  remove?: string[];
}

export type OrgPermissionsMatrix = Partial<Record<MemberRole, OrgRoleOverrides>>;

export interface ResolvePermissionsInput {
  role: MemberRole;
  roleTemplateKey?: string;
  explicitPermissions?: string[];
  permissionOverrides?: PermissionOverrides;
  /** Org-level overrides saved in organizations/{id}/settings/permissionsMatrix */
  orgRoleOverrides?: OrgRoleOverrides;
}

export function resolveEffectivePermissions(input: ResolvePermissionsInput): Permission[] {
  // 1. Code defaults
  const codeBase = ROLE_PERMISSIONS[input.role] ?? [];

  // 2. Org-level overrides (set by owner/admin via PermissionsMatrixView)
  const orgAdd = input.orgRoleOverrides?.add ?? [];
  const orgRemoveSet = new Set(input.orgRoleOverrides?.remove ?? []);
  const baseFromRole: Permission[] = [
    ...codeBase.filter((p) => !orgRemoveSet.has(p)),
    ...(orgAdd as Permission[]),
  ];

  // 3. Role template
  const baseFromTemplate = input.roleTemplateKey
    ? (ROLE_TEMPLATES_BY_KEY[input.roleTemplateKey]?.defaultPermissions ?? [])
    : [];

  // 4. Per-member explicit grants and overrides
  const explicit = (input.explicitPermissions ?? []) as Permission[];
  const add = (input.permissionOverrides?.add ?? []) as Permission[];
  const removeSet = new Set(input.permissionOverrides?.remove ?? []);

  const merged = Array.from(
    new Set<Permission>([...baseFromRole, ...baseFromTemplate, ...explicit, ...add]),
  );
  return merged.filter((permission) => !removeSet.has(permission));
}
