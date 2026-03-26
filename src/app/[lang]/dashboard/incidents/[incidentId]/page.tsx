'use client';

import { Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import FirestoreDocDetails from '../../components/FirestoreDocDetails';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

function IncidentDetailsPageInner() {
  const params = useParams<{ lang?: string; incidentId?: string }>();
  const lang = params?.lang ?? 'pl';
  const incidentId = params?.incidentId ?? '';
  const { organization, currentRestaurant } = useOrganization();
  const { t } = useTranslation(lang, 'dashboard');

  if (!organization?.id || !currentRestaurant?.id) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.no_restaurant_selected', { defaultValue: 'Wybierz restaurację' })}</Typography>
      </PageContainer>
    );
  }

  const docPath = `organizations/${organization.id}/restaurants/${currentRestaurant.id}/incidents/${incidentId}`;
  const title = `${t('dashboard.incidents', { defaultValue: 'Incydenty' })} · ${incidentId}`;

  return <FirestoreDocDetails title={title} docPath={docPath} t={t} />;
}

export default function IncidentDetailsPage() {
  return (
    <RequireOrganization>
      <IncidentDetailsPageInner />
    </RequireOrganization>
  );
}
