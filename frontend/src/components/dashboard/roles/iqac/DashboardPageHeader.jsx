import { Chip, Stack, Typography } from '@mui/material';

/** Page title row for the NAAC Coordinator dashboard. */
export default function DashboardPageHeader() {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.35rem', md: '1.75rem' } }}>
          NAAC Coordinator Dashboard
        </Typography>
        <Chip
          size="small"
          label="Live Synced"
          sx={{
            fontWeight: 700,
            bgcolor: '#DCFCE7',
            color: '#15803D',
            height: 24,
          }}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Institutional NAAC Accreditation Overview — Autonomous Engineering Institute
      </Typography>
    </Stack>
  );
}
