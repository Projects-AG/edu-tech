import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import StatusChip from '../../components/common/StatusChip';
import { TASKS } from '../../data/mock/modules';
import { CRITERIA } from '../../data/mock/criteria';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';

export default function TasksPage() {
  const { roles } = useAuth();
  const canAssign = roles.some((r) =>
    [ROLES.ADMIN, ROLES.IQAC_COORDINATOR, ROLES.CRITERION_INCHARGE].includes(r),
  );
  const [tasks, setTasks] = useState(TASKS);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', criterion: 'C1', due: '', assignee: '' });

  const rows = useMemo(
    () => tasks.filter((t) => filter === 'all' || t.status === filter),
    [tasks, filter],
  );

  const handleAssign = () => {
    if (!form.title || !form.due) return;
    setTasks((prev) => [
      {
        id: `t-${Date.now()}`,
        title: form.title,
        assignee: form.assignee || 'Unassigned',
        due: form.due,
        status: 'Open',
        criterion: form.criterion,
        priority: 'Medium',
      },
      ...prev,
    ]);
    setOpen(false);
    setForm({ title: '', criterion: 'C1', due: '', assignee: '' });
  };

  return (
    <Box>
      <PageHeader
        title="Task Management"
        subtitle="Inbox of work items with due dates and SLA badges"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Tasks' }]}
        action={
          canAssign ? (
            <Button variant="contained" onClick={() => setOpen(true)}>
              Assign task
            </Button>
          ) : null
        }
      />

      <ModuleCard sx={{ mb: 2 }}>
        <TextField select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 180 }}>
          {['all', 'Overdue', 'Due Today', 'Open'].map((s) => (
            <MenuItem key={s} value={s}>
              {s === 'all' ? 'All tasks' : s}
            </MenuItem>
          ))}
        </TextField>
      </ModuleCard>

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Task', 'Criterion', 'Assignee', 'Due', 'Priority', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.title}
                  </Typography>
                </TableCell>
                <TableCell>{row.criterion}</TableCell>
                <TableCell>{row.assignee}</TableCell>
                <TableCell>{row.due}</TableCell>
                <TableCell>
                  <StatusChip label={row.priority} />
                </TableCell>
                <TableCell>
                  <StatusChip label={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleCard>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <TextField select label="Criterion" value={form.criterion} onChange={(e) => setForm((p) => ({ ...p, criterion: e.target.value }))}>
              {CRITERIA.map((c) => (
                <MenuItem key={c.id} value={c.code}>
                  {c.code} · {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Assignee" value={form.assignee} onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))} />
            <TextField type="date" label="Due date" InputLabelProps={{ shrink: true }} value={form.due} onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
