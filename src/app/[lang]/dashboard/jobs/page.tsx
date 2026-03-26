'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box, Typography, Card, CardContent, Stack, Chip,
  CircularProgress,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import PlaceIcon from '@mui/icons-material/Place';
import { collectionGroup, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '../../providers/AuthProvider';
import { useTranslation } from '@/lib/i18n/client';
import PageContainer from '@/app/[lang]/components/PageContainer';

interface JobOfferLocal {
  id: string;
  organizationId: string;
  organizationName?: string;
  restaurantName?: string;
  title: string;
  role: string;
  description: string;
  requirements?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hour' | 'month';
  };
  tags?: string[];
}

function formatSalary(salary: JobOfferLocal['salary'], t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!salary) return '';
  const { min, max, currency, period } = salary;
  const periodLabel = period === 'hour' ? t('dashboard.jobs.per_hour') : t('dashboard.jobs.per_month');
  if (min && max) return `${min}–${max} ${currency}${periodLabel}`;
  if (min) return t('dashboard.jobs.salary_from', { amount: min, currency, period: periodLabel });
  if (max) return t('dashboard.jobs.salary_to', { amount: max, currency, period: periodLabel });
  return '';
}

export default function JobsPage() {
  const { profile } = useAuth();
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const { t } = useTranslation(lang, 'dashboard');

  const [offers, setOffers] = useState<JobOfferLocal[]>([]);
  const [loading, setLoading] = useState(true);

  const isGastronaut = profile?.isGastronaut === true;

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      try {
        const q = query(
          collectionGroup(db, 'jobOffers'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        setOffers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              organizationId: d.ref.parent.parent?.id ?? '',
              organizationName: data.organizationName,
              restaurantName: data.restaurantName,
              title: data.title ?? '',
              role: data.role ?? '',
              description: data.description ?? '',
              requirements: data.requirements,
              salary: data.salary,
              tags: data.tags,
            };
          }),
        );
      } catch (err) {
        console.error('Failed to load job offers:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOffers();
    return () => { cancelled = true; };
  }, []);

  if (!isGastronaut) {
    return (
      <PageContainer sx={{ textAlign: 'center' }}>
        <Typography color="text.secondary">
          {t('dashboard.jobs.gastronaut_only')}
        </Typography>
      </PageContainer>
    );
  }

  return (
    <Box sx={{ p: 2.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 3 }}>
        {t('dashboard.jobs.title')}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : offers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <WorkIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography>
            {t('dashboard.jobs.empty')}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {offer.title}
                </Typography>

                {(offer.organizationName || offer.restaurantName) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <PlaceIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    {[offer.organizationName, offer.restaurantName].filter(Boolean).join(' — ')}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Chip label={offer.role} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                  {offer.salary && (
                    <Chip label={formatSalary(offer.salary, t)} size="small" sx={{ fontWeight: 700 }} />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {offer.description.length > 200
                    ? `${offer.description.slice(0, 200)}...`
                    : offer.description}
                </Typography>

                {offer.requirements && offer.requirements.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {t('dashboard.jobs.requirements')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {offer.requirements.map((req, i) => (
                        <Chip key={i} label={req} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}

                {offer.tags && offer.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {offer.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag.replace(/_/g, ' ')}
                        size="small"
                        sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
