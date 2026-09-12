import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import ModuleCard from '../../../common/ModuleCard';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Welcome banner with institution info and SSR progress. */
export default function WelcomeBanner({ institution, userName }) {
  const {
    academicYear,
    preparationStatus,
    aishe,
    track,
    cycle,
    expectedSubmission,
    ssrCurrentPercent,
    ssrTargetPercent,
  } = institution;

  return (
    <ModuleCard
      sx={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 55%, #ECFDF5 100%)',
        borderColor: 'rgba(37, 99, 235, 0.12)',
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
              {getGreeting()}, NAAC Coordinator
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Academic Year {academicYear}
              {userName ? ` · ${userName}` : ''}
            </Typography>

            <Box
              sx={{
                mt: 2,
                p: 1.75,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                maxWidth: 480,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                NAAC Preparation: {preparationStatus}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Monitor institutional readiness across all seven criteria, evidence compliance, and
                pending coordinator reviews.
              </Typography>
            </Box>
          </Box>

          <Stack spacing={1} sx={{ minWidth: { md: 260 }, flexShrink: 0 }}>
            <Typography variant="body2" color="text.secondary">
              Institutional Track: AISHE: {aishe} | {track}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Accreditation Cycle: {cycle}
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: 'rgba(37, 99, 235, 0.06)',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Expected Submission
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                {expectedSubmission}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="body2" fontWeight={600}>
              Institutional SSR Target Completion: {ssrCurrentPercent}% Complete (On Track)
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Goal {ssrTargetPercent}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={ssrCurrentPercent}
            sx={{
              height: 10,
              borderRadius: 999,
              bgcolor: 'rgba(15, 23, 42, 0.08)',
              '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'primary.main' },
            }}
          />
        </Box>
      </Stack>
    </ModuleCard>
  );
}
