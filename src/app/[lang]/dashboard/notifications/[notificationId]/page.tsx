'use client';

import { useParams } from 'next/navigation';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import FirestoreDocDetails from '../../components/FirestoreDocDetails';
import { useTranslation } from '@/lib/i18n/client';

export default function NotificationDetailsPage() {
  const params = useParams<{ lang?: string; notificationId?: string }>();
  const lang = params?.lang ?? 'pl';
  const notificationId = params?.notificationId ?? '';
  const { t } = useTranslation(lang, 'dashboard');

  const docPath = `notifications/${notificationId}`;
  const title = `${t('dashboard.notifications', { defaultValue: 'Powiadomienia' })} · ${notificationId}`;

  return (
    <RequireOrganization>
      <FirestoreDocDetails title={title} docPath={docPath} t={t} />
    </RequireOrganization>
  );
}

