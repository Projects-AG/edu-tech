import { useEffect, useState } from 'react';
import {
  Alert,
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
import { createUser, listUsers } from '../../api/auth';
import { listDepartments } from '../../api/platform';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_META } from '../../utils/roles';

const ASSIGNABLE = [
  ROLES.IQAC_COORDINATOR,
  ROLES.CRITERION_INCHARGE,
  ROLES.DEPARTMENT_CONTRIBUTOR,
  ROLES.FACULTY,
  ROLES.REVIEWER,
  ROLES.FINAL_APPROVER,
];

export default function UsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.DEPARTMENT_CONTRIBUTOR,
    department_id: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [users, depts] = await Promise.all([
        listUsers(),
        user?.institution_id ? listDepartments(user.institution_id) : Promise.resolve([]),
      ]);
      setRows(users);
      setDepartments(depts);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.institution_id]);

  const handleCreate = async () => {
    try {
      await createUser({
        institution_id: user.institution_id,
        department_id: form.department_id || null,
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        scope_type: form.department_id ? 'DEPARTMENT' : 'INSTITUTION',
      });
      setOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        role: ROLES.DEPARTMENT_CONTRIBUTOR,
        department_id: '',
      });
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not create user.');
    }
  };

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="Invite users and assign roles, department, and criterion scope"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Users' }]}
        action={
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create user
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Alert>
      ) : null}

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Name', 'Email', 'Department', 'Active'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading…</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{row.name}</Typography>
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.department_id || '—'}</TableCell>
                  <TableCell>{row.is_active ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ModuleCard>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <TextField label="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <TextField
              label="Temporary password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              {ASSIGNABLE.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_META[r]?.label || r}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Department (optional)"
              value={form.department_id}
              onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
            >
              <MenuItem value="">None</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
