import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type StoredDoc = { id: string; data: Record<string, unknown> };

const docsByCollection = new Map<string, StoredDoc[]>();
const createCalls: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
const setCalls: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
const failingCreates = new Set<string>();
const filesGetMock = vi.fn();
const requireSeedAdminMock = vi.fn();

const adminCollectionMock = vi.fn((collectionName: string) => ({
  get: vi.fn(async () => ({
    docs: (docsByCollection.get(collectionName) ?? []).map((entry) => ({
      id: entry.id,
      data: () => entry.data,
    })),
  })),
  doc: vi.fn((id: string) => ({
    create: vi.fn(async (data: Record<string, unknown>) => {
      if (failingCreates.has(`${collectionName}/${id}`)) {
        throw new Error('already exists');
      }
      createCalls.push({ collection: collectionName, id, data });
    }),
    set: vi.fn(async (data: Record<string, unknown>) => {
      setCalls.push({ collection: collectionName, id, data });
    }),
  })),
}));

vi.mock('../_lib/auth', () => ({
  requireSeedAdmin: requireSeedAdminMock,
}));

vi.mock('../_lib/drive', () => ({
  getDrive: () => ({
    files: {
      get: filesGetMock,
    },
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: adminCollectionMock,
  },
}));

describe('Seed API routes integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docsByCollection.clear();
    createCalls.length = 0;
    setCalls.length = 0;
    failingCreates.clear();
    requireSeedAdminMock.mockResolvedValue(null);
  });

  it('exports canonical payload with schema version and profile metadata', async () => {
    docsByCollection.set('organizations', [{ id: 'demo-org', data: { name: 'Demo' } }]);
    docsByCollection.set('users', [{ id: 'uid-1', data: { email: 'admin@gastroo.dev' } }]);

    const { GET } = await import('../export/route');
    const req = new NextRequest('http://localhost:5202/api/seed/export?profile=core');
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.meta.schemaVersion).toBe('1.1.0');
    expect(payload.meta.profile).toBe('core');
    expect(payload.firestore.organizations[0].id).toBe('demo-org');
    expect(payload.firestore.users[0].id).toBe('uid-1');
  });

  it('imports canonical payload in strict mode', async () => {
    const canonical = {
      firestore: {
        organizations: [{ id: 'demo-org', name: 'Demo' }],
        users: [{ id: 'uid-1', email: 'admin@gastroo.dev' }],
      },
      meta: {
        schemaVersion: '1.1.0',
      },
    };
    filesGetMock.mockResolvedValue({ data: JSON.stringify(canonical) });

    const { POST } = await import('../import/route');
    const req = new NextRequest('http://localhost:5202/api/seed/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        seedId: 'seed-1',
        collections: ['organizations', 'users'],
        mode: 'strict',
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.summary.imported).toBe(2);
    expect(createCalls).toHaveLength(2);
  });

  it('returns import report in best-effort mode when some documents fail', async () => {
    const canonical = {
      firestore: {
        organizations: [{ id: 'demo-org', name: 'Demo' }, { id: '', name: 'Broken' }],
      },
      meta: {
        schemaVersion: '1.1.0',
      },
    };
    filesGetMock.mockResolvedValue({ data: JSON.stringify(canonical) });
    failingCreates.add('organizations/demo-org');

    const { POST } = await import('../import/route');
    const req = new NextRequest('http://localhost:5202/api/seed/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        seedId: 'seed-1',
        collections: ['organizations'],
        mode: 'best-effort',
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.summary.failed).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.failures)).toBe(true);
  });
});
