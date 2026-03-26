import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requirePermission } from '@/lib/api/auth';
import { createSuccessResponse, ApiError } from '@/lib/api/errorHandler';
import { adminDb } from '@/lib/firebase/admin';
import { PERMISSIONS } from '@/types/organization';

export const runtime = 'nodejs';

function assertWebhookUrl(url: string) {
  if (!url.startsWith('https://chat.googleapis.com/')) {
    throw new ApiError('BAD_REQUEST', 'Invalid Google Chat webhook URL', 400);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    requirePermission(context, PERMISSIONS.CHAT_VIEW);

    const orgDoc = await adminDb.doc(`organizations/${context.orgId}`).get();
    const data = orgDoc.data() ?? {};
    const webhookUrl = data.integrations?.googleChat?.webhookUrl ?? null;

    return NextResponse.json(createSuccessResponse({
      configured: Boolean(webhookUrl),
      webhookUrl,
    }));
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    requirePermission(context, PERMISSIONS.INTEGRATIONS_MANAGE);
    const body = await request.json();
    const webhookUrl = String(body.webhookUrl ?? '').trim();

    if (!webhookUrl) {
      throw new ApiError('BAD_REQUEST', 'webhookUrl is required', 400);
    }

    assertWebhookUrl(webhookUrl);

    await adminDb.doc(`organizations/${context.orgId}`).set({
      integrations: {
        googleChat: {
          webhookUrl,
          updatedAt: new Date(),
          updatedBy: context.userId,
        },
      },
    }, { merge: true });

    return NextResponse.json(createSuccessResponse({ configured: true, webhookUrl }));
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    requirePermission(context, PERMISSIONS.CHAT_SEND);
    const body = await request.json();
    const text = String(body.text ?? '').trim();

    if (!text) {
      throw new ApiError('BAD_REQUEST', 'text is required', 400);
    }

    const orgDoc = await adminDb.doc(`organizations/${context.orgId}`).get();
    const data = orgDoc.data() ?? {};
    const webhookUrl = data.integrations?.googleChat?.webhookUrl ?? '';

    if (!webhookUrl) {
      throw new ApiError('BAD_REQUEST', 'Google Chat webhook is not configured', 400);
    }

    assertWebhookUrl(webhookUrl);

    const payload = {
      text: `[${context.orgId}] ${text}`,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ApiError('BAD_GATEWAY', 'Google Chat webhook rejected message', 502);
    }

    return NextResponse.json(createSuccessResponse({ sent: true }));
  });
}
