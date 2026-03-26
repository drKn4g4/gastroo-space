'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Stack, Typography, Chip } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { useOrganization } from '../../../providers/OrganizationProvider';
import { db } from '@/lib/firebase/config';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

type MemberDoc = {
  email?: string;
  displayName?: string;
  role?: string;
  permissions?: string[];
  restaurantIds?: string[];
  joinedAt?: unknown;
};

export default function MemberDetailsPage() {
  const { user, loading } = useAuth();
  const { organization } = useOrganization();
  const router = useRouter();
  const params = useParams<{ lang?: string; memberId?: string }>();
  const lang = params?.lang ?? 'pl';
  const memberId = params?.memberId ?? '';
  const { t } = useTranslation(lang, 'team');

  const [fetching, setFetching] = useState(true);
  const [member, setMember] = useState<MemberDoc | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push(`/${lang}/login`);
  }, [user, loading, router, lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organization?.id || !memberId) { setFetching(false); return; }
      setFetching(true);
      setNotFound(false);
      try {
        const snap = await getDoc(doc(db, `organizations/${organization.id}/members/${memberId}`));
        if (cancelled) return;
        if (!snap.exists()) {
          setMember(null);
          setNotFound(true);
          return;
        }
        setMember(snap.data() as MemberDoc);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [organization?.id, memberId]);

  const label = useMemo(() => {
    if (!member) return '';
    return member.displayName || member.email || memberId;
  }, [member, memberId]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetching) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !member) {
    return (
      <PageContainer>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t('team.title', { defaultValue: 'Zespół' })}
        </Typography>
        <Typography color="text.secondary">Not found: {memberId}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {label}
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            {member.email ? <Typography color="text.secondary">{member.email}</Typography> : null}
            {member.role ? <Chip label={t(`team.roles.${member.role}`, { defaultValue: member.role })} size="small" /> : null}
            {Array.isArray(member.permissions) && member.permissions.length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                perms: {member.permissions.join(', ')}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
