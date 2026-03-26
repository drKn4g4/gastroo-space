import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/organization';

const requirePermissionMock = vi.fn();
const withAuthMock = vi.fn();
const getMock = vi.fn();
const setMock = vi.fn();

vi.mock('@/lib/api/auth', () => ({
  withAuth: withAuthMock,
  requirePermission: requirePermissionMock,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    doc: vi.fn(() => ({
      get: getMock,
      set: setMock,
    })),
  },
}));

describe('/api/google-chat/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withAuthMock.mockImplementation(async (_request: NextRequest, handler: (context: Record<string, unknown>) => Promise<Response>) => {
      return handler({
        userId: 'u1',
        orgId: 'org-1',
        permissions: [PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_SEND, PERMISSIONS.INTEGRATIONS_MANAGE],
      });
    });
  });

  it('GET returns webhook config status', async () => {
    const { GET } = await import('../route');
    getMock.mockResolvedValue({
      data: () => ({ integrations: { googleChat: { webhookUrl: 'https://chat.googleapis.com/v1/spaces/x/messages?key=1' } } }),
    });

    const req = new NextRequest('http://localhost:5202/api/google-chat/webhook?orgId=org-1');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.configured).toBe(true);
    expect(requirePermissionMock).toHaveBeenCalledWith(expect.any(Object), PERMISSIONS.CHAT_VIEW);
  });

  it('PATCH validates webhook URL', async () => {
    const { PATCH } = await import('../route');

    const req = new NextRequest('http://localhost:5202/api/google-chat/webhook', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgId: 'org-1', webhookUrl: 'https://evil.example.com/hook' }),
    });

    await expect(PATCH(req)).rejects.toThrow('Invalid Google Chat webhook URL');
  });

  it('POST sends message to configured webhook', async () => {
    const { POST } = await import('../route');
    getMock.mockResolvedValue({
      data: () => ({ integrations: { googleChat: { webhookUrl: 'https://chat.googleapis.com/v1/spaces/x/messages?key=1' } } }),
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    const req = new NextRequest('http://localhost:5202/api/google-chat/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgId: 'org-1', text: 'Test wiadomości' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
