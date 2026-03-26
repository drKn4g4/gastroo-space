import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export const runtime = 'nodejs';

export async function GET() {
  const filePath = path.join(process.cwd(), 'swagger-seed.yaml');
  const spec = await readFile(filePath, 'utf8');

  return new NextResponse(spec, {
    headers: {
      'Content-Type': 'application/yaml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

