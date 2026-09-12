import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ModuleCard from '../../../common/ModuleCard';
import StatusChip from '../../../common/StatusChip';

/** Recent department submissions awaiting coordinator inspect. */
export default function RecentSubmissionsPanel({ items }) {
  return (
    <ModuleCard>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.75 }}>
        Recent Submissions
      </Typography>

      <Stack spacing={1.25}>
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.35 }}>
              {item.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.criterion} · {item.department}
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <StatusChip label={item.status} />
              <Button
                component={RouterLink}
                to={item.path}
                size="small"
                sx={{ fontWeight: 600, minWidth: 0 }}
              >
                Inspect
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </ModuleCard>
  );
}
