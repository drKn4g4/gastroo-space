'use client';

import { Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SpacePageContainer from '../../space/components/SpacePageContainer';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';

export default function FoodieSearchPage() {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang ?? 'pl';
  const { t } = useTranslation(lang, 'space');

  return (
    <SpacePageContainer sx={{ textAlign: 'center', alignItems: 'center' }}>
      <SearchIcon sx={{ fontSize: 'clamp(2.25rem, 10vw, 3rem)', mt: 1, color: 'primary.main' }} />
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {t('foodie_search.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('foodie_search.subtitle')}
      </Typography>
    </SpacePageContainer>
  );
}
