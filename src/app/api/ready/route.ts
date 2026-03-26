import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      ready: true,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
