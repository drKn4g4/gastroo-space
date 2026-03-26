import type { Metadata } from 'next';
import SwaggerSeedUI from './SwaggerSeedUI';

export const metadata: Metadata = {
  title: 'Swagger UI — Seeds',
};

export default function SwaggerSeedPage() {
  return <SwaggerSeedUI />;
}

