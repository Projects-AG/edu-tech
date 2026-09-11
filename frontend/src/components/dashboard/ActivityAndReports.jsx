import { List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import ModuleCard from '../common/ModuleCard';

export default function ActivityFeed({ items }) {
  return (
    <ModuleCard>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Recent Activity
      </Typography>
      <List disablePadding>
        {items.map((item) => (
          <ListItem key={item.id} alignItems="flex-start" sx={{ px: 0, py: 1.1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <ListItemText
              primary={item.text}
              secondary={item.time}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    </ModuleCard>
  );
}

export function QuickReportsList({ items }) {
  return (
    <ModuleCard>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Quick Reports
      </Typography>
      <Stack spacing={1.25}>
        {items.map((item) => (
          <Stack
            key={item.id}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: '#F8FAFC',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {item.status}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </ModuleCard>
  );
}
