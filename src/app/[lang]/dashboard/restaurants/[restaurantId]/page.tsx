'use client';

import { Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import FirestoreDocDetails from '../../components/FirestoreDocDetails';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

function RestaurantDetailsPageInner() {
  const params = useParams<{ lang?: string; restaurantId?: string }>();
  const lang = params?.lang ?? 'pl';
  const restaurantId = params?.restaurantId ?? '';
  const { organization } = useOrganization();
  const { t } = useTranslation(lang, 'dashboard');

  if (!organization?.id) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.search.no_results')}</Typography>
      </PageContainer>
    );
  }

  const docPath = `organizations/${organization.id}/restaurants/${restaurantId}`;
  const title = `${t('dashboard.locations.title', { defaultValue: 'Lokale' })} · ${restaurantId}`;

  return <FirestoreDocDetails title={title} docPath={docPath} t={t} />;
}

export default function RestaurantDetailsPage() {
  return (
    <RequireOrganization>
      <RestaurantDetailsPageInner />
    </RequireOrganization>
  );
}
