'use client';

import { Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import FirestoreDocDetails from '../../components/FirestoreDocDetails';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

function SectionDetailsPageInner() {
  const params = useParams<{ lang?: string; sectionId?: string }>();
  const lang = params?.lang ?? 'pl';
  const sectionId = params?.sectionId ?? '';
  const { organization, currentRestaurant } = useOrganization();
  const { t } = useTranslation(lang, 'dashboard');

  if (!organization?.id || !currentRestaurant?.id) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.no_restaurant_selected', { defaultValue: 'Wybierz restaurację' })}</Typography>
      </PageContainer>
    );
  }

  const docPath = `organizations/${organization.id}/restaurants/${currentRestaurant.id}/sections/${sectionId}`;
  const title = `${t('dashboard.floorplan.title', { defaultValue: 'Plan sali' })} · ${sectionId}`;

  return <FirestoreDocDetails title={title} docPath={docPath} t={t} />;
}

export default function SectionDetailsPage() {
  return (
    <RequireOrganization>
      <SectionDetailsPageInner />
    </RequireOrganization>
  );
}
