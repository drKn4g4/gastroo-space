'use client';

import { Box, Stack, Typography } from '@mui/material';

type SessionContextStripProps = {
  locationName: string;
  organizationName?: string;
  userLabel?: string;
  roleLabel?: string;
  align?: 'left' | 'right';
};

export default function SessionContextStrip({
  locationName,
  organizationName,
  userLabel,
  roleLabel,
  align = 'left',
}: SessionContextStripProps) {
  const textAlign = align === 'right' ? 'right' : 'left';

  return (
    <Stack sx={{ minWidth: 0, textAlign }} spacing={0.15}>
      {locationName ? (
        <Typography variant="body2" fontWeight={800} letterSpacing="-0.02em" color="text.primary" noWrap>
          {locationName}
        </Typography>
      ) : null}

      {organizationName ? (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.1 }} noWrap>
          {organizationName}
        </Typography>
      ) : null}

      {userLabel ? (
        <Box sx={{ display: 'inline-flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, fontWeight: 700 }} noWrap>
            {userLabel}
          </Typography>
          {roleLabel ? (
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.1 }} noWrap>
              [{roleLabel}]
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Stack>
  );
}
