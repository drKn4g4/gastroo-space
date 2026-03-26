'use client';

import { Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import FirestoreDocDetails from '../../components/FirestoreDocDetails';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

function decodePathSegments(raw: string[] | undefined): string[] {
  if (!raw) return [];
  return raw
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .filter(Boolean);
}

export default function FirestoreDocPage() {
  const params = useParams<{ lang?: string; path?: string[] }>();
  const lang = params?.lang ?? 'pl';
  const { t } = useTranslation(lang, 'dashboard');

  const segments = decodePathSegments(params?.path);
  const docPath = segments.join('/');

  if (segments.length === 0) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.search.no_results')}</Typography>
      </PageContainer>
    );
  }

  if (segments.length % 2 !== 0) {
    return (
      <PageContainer>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          Firestore doc
        </Typography>
        <Typography color="text.secondary">
          Invalid document path (expected even number of segments): {docPath}
        </Typography>
      </PageContainer>
    );
  }

  const title = segments[segments.length - 1] ?? '—';

  return <FirestoreDocDetails title={title} docPath={docPath} t={t} />;
}
