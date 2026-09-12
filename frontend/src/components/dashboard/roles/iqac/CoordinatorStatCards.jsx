import { Box, Chip, Stack, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ModuleCard from '../../../common/ModuleCard';

const TONE_COLORS = {
  primary: '#2563EB',
  success: '#16A34A',
  info: '#0EA5E9',
  warning: '#F59E0B',
  error: '#EF4444',
};

function StatCard({ item }) {
  const color = TONE_COLORS[item.tone] || TONE_COLORS.primary;

  return (
    <ModuleCard sx={{ flex: '1 1 160px', minWidth: 160 }}>
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {item.label}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, color }}>
            {item.value}
          </Typography>
          {item.delta ? (
            <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: item.deltaUp ? 'success.main' : 'error.main' }}>
              {item.deltaUp ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : null}
              <Typography variant="caption" fontWeight={700}>
                {item.delta}
              </Typography>
            </Stack>
          ) : null}
          {item.badge ? (
            <Chip
              size="small"
              label={item.badge}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: `${color}18`,
                color,
              }}
            />
          ) : null}
        </Stack>
        {item.hint ? (
          <Typography variant="caption" color="text.secondary">
            {item.hint}
          </Typography>
        ) : null}
      </Stack>
    </ModuleCard>
  );
}

/** Five KPI tiles for the coordinator overview. */
export default function CoordinatorStatCards({ stats }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {stats.map((item) => (
        <StatCard key={item.id} item={item} />
      ))}
    </Box>
  );
}
