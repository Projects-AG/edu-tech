import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ModuleCard from '../../common/ModuleCard';
import StatusChip from '../../common/StatusChip';

export default function CriteriaMonitorGrid({ items = [] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          lg: '1fr 1fr 1fr 1fr',
        },
      }}
    >
      {items.map((item) => (
        <ModuleCard key={item.id}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Chip
                size="small"
                label={item.code}
                sx={{ fontWeight: 700, bgcolor: 'rgba(37,99,235,0.08)', color: 'primary.main' }}
              />
              <StatusChip label={item.status} />
            </Stack>

            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>
                {item.description}
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700}>
                  Progress
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {item.percent}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={item.percent}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: 'rgba(15,23,42,0.06)',
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
            </Box>

            <Stack direction="row" justifyContent="space-between">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Evidence
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {item.evidence}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {item.pending}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {item.departments} Departments
              </Typography>
              <Button
                component={RouterLink}
                to={`/app/criteria/${item.id}`}
                size="small"
                sx={{ fontWeight: 700 }}
              >
                View Details →
              </Button>
            </Stack>
          </Stack>
        </ModuleCard>
      ))}
    </Box>
  );
}
