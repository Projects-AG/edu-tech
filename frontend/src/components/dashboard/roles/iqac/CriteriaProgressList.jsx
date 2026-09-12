import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ModuleCard from '../../../common/ModuleCard';
import StatusChip from '../../../common/StatusChip';

const BAR_COLORS = {
  Completed: '#16A34A',
  'In Progress': '#2563EB',
  'Needs Attention': '#F59E0B',
  'Needs Correction': '#EF4444',
  Critical: '#EF4444',
};

function CriteriaRow({ item }) {
  const barColor = BAR_COLORS[item.status] || '#2563EB';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'auto 1fr auto',
        },
        gap: { xs: 1.25, sm: 2 },
        alignItems: 'center',
        py: 1.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none', pb: 0 },
        '&:first-of-type': { pt: 0 },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: `${barColor}14`,
          color: barColor,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {item.code}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {item.name}
          </Typography>
          <StatusChip label={item.status} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Lead: {item.lead} — Evidence: {item.evidenceCollected}/{item.evidenceTotal} files
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={item.percent}
            sx={{
              flex: 1,
              height: 7,
              borderRadius: 999,
              bgcolor: 'rgba(15,23,42,0.06)',
              '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: barColor },
            }}
          />
          <Typography variant="caption" fontWeight={700} sx={{ minWidth: 36, textAlign: 'right' }}>
            {item.percent}%
          </Typography>
        </Stack>
      </Box>

      <Button
        component={RouterLink}
        to={`/app/criteria/${item.id}`}
        size="small"
        variant="text"
        sx={{ justifySelf: { xs: 'start', sm: 'end' }, fontWeight: 600 }}
      >
        View Criterion
      </Button>
    </Box>
  );
}

/** List of C1–C7 progress rows. */
export default function CriteriaProgressList({ items }) {
  return (
    <ModuleCard>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            NAAC Criteria Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time status across all 7 manual criteria benchmarks
          </Typography>
        </Box>
        <Button component={RouterLink} to="/app/criteria" size="small" sx={{ fontWeight: 600 }}>
          View All Criteria
        </Button>
      </Stack>

      <Box>
        {items.map((item) => (
          <CriteriaRow key={item.id} item={item} />
        ))}
      </Box>
    </ModuleCard>
  );
}
