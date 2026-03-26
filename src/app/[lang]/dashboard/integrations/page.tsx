'use client';

import {
  Box, Typography, Card, CardContent, CardActions,
  Button, Chip, Stack, Alert, Divider, Avatar,
} from '@mui/material';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RequireOrganization from '@/app/[lang]/components/RequireOrganization';
import DriveIntegration from './DriveIntegration';
import GBPIntegration from './GBPIntegration';
import MenuExport from './MenuExport';
import GoogleCalendarIntegration from './GoogleCalendarIntegration';
import WorkspaceIntegration from './WorkspaceIntegration';
import { useTranslation } from '@/lib/i18n/client';
import { useParams } from 'next/navigation';
import PageContainer from '@/app/[lang]/components/PageContainer';

interface Integration {
  id: string;
  name: string;
  categoryKey: string;
  descriptionKey: string;
  logoText: string;
  logoColor: string;
  status: 'available' | 'coming_soon' | 'beta';
  learnMoreUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  // Bookings
  {
    id: 'thefork',
    name: 'TheFork',
    categoryKey: 'cat_bookings',
    descriptionKey: 'thefork_desc',
    logoText: 'TF',
    logoColor: '#00A551',
    status: 'coming_soon',
  },
  {
    id: 'opentable',
    name: 'OpenTable',
    categoryKey: 'cat_bookings',
    descriptionKey: 'opentable_desc',
    logoText: 'OT',
    logoColor: '#DA3743',
    status: 'coming_soon',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    categoryKey: 'cat_bookings',
    descriptionKey: 'booking_desc',
    logoText: 'B.',
    logoColor: '#003580',
    status: 'coming_soon',
  },
  // Delivery
  {
    id: 'glovo',
    name: 'Glovo',
    categoryKey: 'cat_delivery',
    descriptionKey: 'glovo_desc',
    logoText: 'G',
    logoColor: '#FFC244',
    status: 'coming_soon',
  },
  {
    id: 'bolt-food',
    name: 'Bolt Food',
    categoryKey: 'cat_delivery',
    descriptionKey: 'bolt_desc',
    logoText: 'BF',
    logoColor: '#34D186',
    status: 'coming_soon',
  },
  {
    id: 'uber-eats',
    name: 'Uber Eats',
    categoryKey: 'cat_delivery',
    descriptionKey: 'uber_desc',
    logoText: 'UE',
    logoColor: '#000000',
    status: 'coming_soon',
  },
  // Reviews
  {
    id: 'tripadvisor',
    name: 'TripAdvisor',
    categoryKey: 'cat_reviews',
    descriptionKey: 'tripadvisor_desc',
    logoText: 'TA',
    logoColor: '#00AF87',
    status: 'coming_soon',
  },
  {
    id: 'google-reviews',
    name: 'Google Reviews',
    categoryKey: 'cat_reviews',
    descriptionKey: 'google_reviews_desc',
    logoText: 'G',
    logoColor: '#4285F4',
    status: 'beta',
  },
  // POS
  {
    id: 'poster',
    name: 'Poster POS',
    categoryKey: 'cat_pos',
    descriptionKey: 'poster_desc',
    logoText: 'P',
    logoColor: '#FF6B35',
    status: 'coming_soon',
  },
];

// Group integrations by categoryKey
function groupByCategory(integrations: Integration[]) {
  return integrations.reduce<Record<string, Integration[]>>((acc, item) => {
    acc[item.categoryKey] = acc[item.categoryKey] ?? [];
    acc[item.categoryKey].push(item);
    return acc;
  }, {});
}

function IntegrationsContent() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');

  const grouped = groupByCategory(INTEGRATIONS);

  const STATUS_LABELS = {
    available: { label: t('dashboard.integrations.status_active'), color: 'success' as const },
    coming_soon: { label: t('dashboard.integrations.status_coming_soon'), color: 'default' as const },
    beta: { label: t('dashboard.integrations.status_beta'), color: 'warning' as const },
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <IntegrationInstructionsIcon color="primary" />
        <Typography variant="h5" fontWeight={700} color="text.primary">{t('dashboard.integrations.title')}</Typography>
      </Stack>
      <Typography color="text.secondary" mb={3}>
        {t('dashboard.integrations.subtitle')}
      </Typography>

      {/* Google Drive Integration Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color="text.secondary">
          {t('dashboard.integrations.section_resources')}
        </Typography>
        <DriveIntegration />
      </Box>

      {/* GBP Integration Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color="text.secondary">
          Google Business Profile
        </Typography>
        <GBPIntegration />
      </Box>

      {/* Menu Export Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" fontWeight={700} mb={0.5} color="text.secondary">
          {t('dashboard.integrations.section_menu_export')}
        </Typography>
        <Typography variant="body2" color="text.disabled" mb={2}>
          {t('dashboard.integrations.section_menu_export_desc')}
        </Typography>
        <MenuExport />
      </Box>

      {/* Google Calendar Integration Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color="text.secondary">
          Google Calendar
        </Typography>
        <GoogleCalendarIntegration />
      </Box>

        {/* Google Workspace Integration Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h6" fontWeight={700} mb={2} color="text.secondary">
            Google Workspace (Sheets, Docs, Tasks)
          </Typography>
          <WorkspaceIntegration />
        </Box>

      <Alert severity="info" icon={<CheckCircleIcon />} sx={{ mb: 4 }}>
        {t('dashboard.integrations.coming_soon_alert')}
      </Alert>


      <Stack spacing={4}>
        {Object.entries(grouped).map(([categoryKey, items]) => (
          <Box key={categoryKey}>
            <Typography variant="h6" fontWeight={700} mb={2} color="text.secondary">
              {t(`dashboard.integrations.${categoryKey}`)}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
              }}
            >
              {items.map((integration) => {
                const status = STATUS_LABELS[integration.status];
                return (
                  <Card
                    key={integration.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      opacity: integration.status === 'coming_soon' ? 0.85 : 1,
                      transition: '0.2s',
                      '&:hover': { boxShadow: 4 },
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                        <Avatar
                          sx={{
                            bgcolor: integration.logoColor,
                            width: 44,
                            height: 44,
                            fontSize: 14,
                            fontWeight: 800,
                            color: '#fff',
                          }}
                        >
                          {integration.logoText}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700}>{integration.name}</Typography>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                          />
                        </Box>
                      </Stack>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t(`dashboard.integrations.${integration.descriptionKey}`)}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      {integration.status === 'available' ? (
                        <Button size="small" variant="contained">
                          {t('dashboard.integrations.connect')}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          disabled={integration.status === 'coming_soon'}
                        >
                          {integration.status === 'beta' ? t('dashboard.integrations.join_beta') : t('dashboard.integrations.notify_me')}
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                );
              })}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function IntegrationsPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { t } = useTranslation(lang, 'dashboard');

	  return (
	    <RequireOrganization>
	      <PageContainer>
	        <Typography variant="h4" fontWeight={900} gutterBottom>
	          {t('dashboard.integrations.title')}
	        </Typography>
	        <Stack spacing={4}>
	          <DriveIntegration />
	          <GBPIntegration />
	          <GoogleCalendarIntegration />
	          <MenuExport />
	            <WorkspaceIntegration />
	        </Stack>
	      </PageContainer>
	    </RequireOrganization>
	  );
	}
