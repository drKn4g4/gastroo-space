import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

type PublicStats = {
  usersCount: number;
  gastronautsCount: number;
  organizationsCount: number;
};

async function countCollection(path: string): Promise<number> {
  try {
    const aggregate = await adminDb.collection(path).count().get();
    return Number(aggregate.data().count ?? 0);
  } catch {
    const snapshot = await adminDb.collection(path).get();
    return snapshot.size;
  }
}

export async function GET() {
  try {
    const [usersCount, organizationsCount, gastronautsCount] = await Promise.all([
      countCollection('users'),
      countCollection('organizations'),
      adminDb.collection('users').where('gastronaut', '==', true).count().get().then((result) => Number(result.data().count ?? 0)).catch(async () => {
        const snapshot = await adminDb.collection('users').where('gastronaut', '==', true).get();
        return snapshot.size;
      }),
    ]);

    const payload: PublicStats = {
      usersCount,
      gastronautsCount,
      organizationsCount,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json(
      {
        usersCount: 0,
        gastronautsCount: 0,
        organizationsCount: 0,
      } satisfies PublicStats,
      { status: 200 },
    );
  }
}
