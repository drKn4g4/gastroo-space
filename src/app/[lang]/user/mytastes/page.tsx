import { Typography } from '@mui/material';
import PageContainer from '@/app/[lang]/components/PageContainer';

export default function MyTastesPage() {
  return (
    <PageContainer>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
        Moje smaki
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Skonfiguruj swoje preferencje wyszukiwania: dieta, alergeny, ulubione kuchnie, tagi.
      </Typography>
      {/* Tu pojawi się UI do wyboru preferencji */}
    </PageContainer>
  );
}
