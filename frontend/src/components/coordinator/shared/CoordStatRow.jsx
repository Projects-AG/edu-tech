import { Box, Chip, Stack, Typography } from '@mui/material';
import ModuleCard from '../../common/ModuleCard';

const TONE = {
  primary: '#2563EB',
  success: '#16A34A',
  info: '#0EA5E9',
  warning: '#F59E0B',
  error: '#EF4444',
};

function StatCard({ item }) {
  const color = TONE[item.tone] || TONE.primary;
  return (
    <ModuleCard sx={{ flex: '1 1 180px', minWidth: 170 }}>
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {item.label}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
            {item.value}
          </Typography>
          {item.badge ? (
            <Chip
              size="small"
              label={item.badge}
              sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: `${color}18`, color }}
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

/** Responsive row of summary KPI cards. */
export default function CoordStatRow({ stats = [] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
      {stats.map((item) => (
        <StatCard key={item.id} item={item} />
      ))}
    </Box>
  );
}
