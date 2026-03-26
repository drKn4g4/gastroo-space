import {
  buildSeedExportPayload,
  CURRENT_SEED_SCHEMA_VERSION,
  getRequestedCollections,
  resolveSeedCollections,
  type SeedCollections,
} from '../seed-format';

describe('seed format helpers', () => {
  it('supports export -> import round-trip for canonical payload', () => {
    const input: SeedCollections = {
      organizations: [{ id: 'demo-org', name: 'Demo Org' }],
      users: [{ id: 'uid-1', email: 'admin@gastroo.dev' }],
    };

    const payload = buildSeedExportPayload(input, ['organizations', 'users'], new Date('2026-03-17T00:00:00.000Z'));
    const restored = resolveSeedCollections(payload);

    expect(restored).toEqual(input);
    expect(payload.meta.schemaVersion).toBe(CURRENT_SEED_SCHEMA_VERSION);
  });

  it('supports legacy flat payloads', () => {
    const legacy = {
      organizations: [{ id: 'demo-org' }],
      users: [{ id: 'uid-1' }],
      meta: { exportedAt: '2026-03-17T00:00:00.000Z' },
    };

    const restored = resolveSeedCollections(legacy);
    expect(restored).toEqual({
      organizations: [{ id: 'demo-org' }],
      users: [{ id: 'uid-1' }],
    });
  });

  it('uses query collection list and CSV variants', () => {
    const repeated = new URL('http://localhost:5202/api/seed/export?collection=organizations&collection=users');
    expect(getRequestedCollections(repeated)).toEqual(['organizations', 'users']);

    const csv = new URL('http://localhost:5202/api/seed/export?collections=organizations,users');
    expect(getRequestedCollections(csv)).toEqual(['organizations', 'users']);

    const profile = new URL('http://localhost:5202/api/seed/export?profile=integration');
    expect(getRequestedCollections(profile)).toEqual(['organizations', 'users', 'integrations', 'files']);

    const defaults = new URL('http://localhost:5202/api/seed/export');
    expect(getRequestedCollections(defaults)).toEqual([]);
  });
});
