import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import { NOTIFICATIONS } from '../../data/mock/modules';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assignment', label: 'Assignments' },
  { id: 'review', label: 'Reviews' },
  { id: 'deadline', label: 'Deadlines' },
  { id: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const [items, setItems] = useState(NOTIFICATIONS);
  const [tab, setTab] = useState('all');

  const filtered = useMemo(
    () => items.filter((n) => tab === 'all' || n.type === tab),
    [items, tab],
  );

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const toggleRead = (id) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Assignments, reviews, deadlines and system alerts"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Notifications' }]}
        action={
          <Button variant="outlined" onClick={markAllRead}>
            Mark all read
          </Button>
        }
      />

      <ModuleCard sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {FILTERS.map((f) => (
            <Tab key={f.id} value={f.id} label={f.label} />
          ))}
        </Tabs>
      </ModuleCard>

      <Stack spacing={1.25}>
        {filtered.map((item) => (
          <ModuleCard
            key={item.id}
            sx={{
              bgcolor: item.read ? 'background.paper' : 'rgba(37,99,235,0.04)',
              borderColor: item.read ? 'divider' : 'primary.light',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography fontWeight={700}>{item.title}</Typography>
                  {!item.read ? <Chip size="small" color="primary" label="New" /> : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {item.body}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.time} · {item.type}
                </Typography>
              </Box>
              <Button size="small" onClick={() => toggleRead(item.id)}>
                {item.read ? 'Mark unread' : 'Mark read'}
              </Button>
            </Stack>
          </ModuleCard>
        ))}
      </Stack>

      <ModuleCard sx={{ mt: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Email / SMS / WhatsApp notification preferences will be available when the Notification Service is connected.
        </Typography>
      </ModuleCard>
    </Box>
  );
}
