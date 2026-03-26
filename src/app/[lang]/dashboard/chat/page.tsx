'use client';

import { Box, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { ChatPageClient } from './ChatPageClient';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import PermissionGate from '@/app/[lang]/components/PermissionGate';
import { PERMISSIONS } from '@/types/organization';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function ChatPage() {
  const params = useParams();
  const lang = (params?.lang as string) || 'pl';
  const { t } = useTranslation(lang, 'dashboard');

	  return (
	    <RequireOrganization>
	      <PermissionGate permission={PERMISSIONS.CHAT_VIEW} fallback={
	        <PageContainer sx={{ textAlign: 'center' }}>
	          <Typography color="text.secondary">{t('dashboard.chat.no_access')}</Typography>
	        </PageContainer>
	      }>
	        <ChatPageClient />
	      </PermissionGate>
	    </RequireOrganization>
	  );
	}
