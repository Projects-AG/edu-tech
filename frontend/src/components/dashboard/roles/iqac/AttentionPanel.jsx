import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ModuleCard from '../../../common/ModuleCard';
import StatusChip from '../../../common/StatusChip';

/** Urgent alerts requiring coordinator action. */
export default function AttentionPanel({ items, urgentCount = 4 }) {
  return (
    <ModuleCard>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
        <Typography variant="h6" fontWeight={700}>
          Attention Required
        </Typography>
        <Chip
          size="small"
          label={`${urgentCount} Urgent`}
          sx={{ fontWeight: 700, bgcolor: '#FEE2E2', color: '#B91C1C', height: 24 }}
        />
      </Stack>

      <Stack spacing={1.25}>
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(248, 250, 252, 0.8)',
            }}
          >
            <Stack spacing={1}>
              <StatusChip label={item.status} />
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35 }}>
                {item.title}
              </Typography>
              <Button
                component={RouterLink}
                to={item.actionPath}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
              >
                {item.actionLabel}
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </ModuleCard>
  );
}
