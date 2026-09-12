import { Box, Chip, Stack, Typography } from '@mui/material';

/** Consistent page title block used across coordinator modules. */
export default function CoordPageHeader({ title, subtitle, badge = 'Live Synced', action }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      spacing={1.5}
      sx={{ mb: 2.5 }}
    >
      <Box>
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.35rem', md: '1.7rem' } }}>
            {title}
          </Typography>
          {badge ? (
            <Chip
              size="small"
              label={badge}
              sx={{ height: 24, fontWeight: 700, bgcolor: '#DCFCE7', color: '#15803D' }}
            />
          ) : null}
        </Stack>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}
