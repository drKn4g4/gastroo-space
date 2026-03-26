'use client';

import { Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import { useOrganization } from '@/app/[lang]/providers/OrganizationProvider';
import FirestoreDocDetails from '../../components/FirestoreDocDetails';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

function TimeEntryDetailsPageInner() {
  const params = useParams<{ lang?: string; entryId?: string }>();
  const lang = params?.lang ?? 'pl';
  const entryId = params?.entryId ?? '';
  const { organization, currentRestaurant } = useOrganization();
  const { t } = useTranslation(lang, 'dashboard');

  if (!organization?.id || !currentRestaurant?.id) {
    return (
      <PageContainer>
        <Typography color="text.secondary">{t('dashboard.no_restaurant_selected', { defaultValue: 'Wybierz restaurację' })}</Typography>
      </PageContainer>
    );
  }

  const docPath = `organizations/${organization.id}/restaurants/${currentRestaurant.id}/timeEntries/${entryId}`;
  const title = `${t('dashboard.time_entries', { defaultValue: 'Czas pracy' })} · ${entryId}`;

  return <FirestoreDocDetails title={title} docPath={docPath} t={t} />;
}

export default function TimeEntryDetailsPage() {
  return (
    <RequireOrganization>
      <TimeEntryDetailsPageInner />
    </RequireOrganization>
  );
}
