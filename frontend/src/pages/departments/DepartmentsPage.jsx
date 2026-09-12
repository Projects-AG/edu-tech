import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import { createDepartment, listDepartments } from '../../api/platform';
import { DEPT_PROGRESS } from '../../data/mock/modules';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import CoordinatorDepartmentsPage from '../coordinator/CoordinatorDepartmentsPage';

export default function DepartmentsPage() {
  const { user, roles, activeRole } = useAuth();
  if (activeRole === ROLES.IQAC_COORDINATOR) return <CoordinatorDepartmentsPage />;

  const canCreate = roles.includes(ROLES.ADMIN) || roles.includes(ROLES.IQAC_COORDINATOR);
  const [apiDepts, setApiDepts] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const load = async () => {
    if (!user?.institution_id) return;
    try {
      const data = await listDepartments(user.institution_id);
      setApiDepts(data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load departments from API. Showing progress demo data.');
    }
  };

  useEffect(() => {
    load();
  }, [user?.institution_id]);

  const handleCreate = async () => {
    try {
      await createDepartment({
        institution_id: user.institution_id,
        name,
        code: code || name.slice(0, 4).toUpperCase(),
      });
      setOpen(false);
      setName('');
      setCode('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Create failed.');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Departments"
        subtitle="Department progress, contributors, and evidence gaps"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Departments' }]}
        action={
          canCreate ? (
            <Button variant="contained" onClick={() => setOpen(true)}>
              Add department
            </Button>
          ) : null
        }
      />

      {error ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Progress workspace
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {DEPT_PROGRESS.map((dept) => (
          <Grid key={dept.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <ModuleCard>
              <Typography fontWeight={700}>{dept.name}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                {dept.progress}%
              </Typography>
              <LinearProgress variant="determinate" value={dept.progress} sx={{ my: 1, height: 8, borderRadius: 999 }} />
              <Typography variant="body2" color="text.secondary">
                {dept.contributors} contributors · {dept.pendingEvidence} pending evidence
              </Typography>
              <Button size="small" sx={{ mt: 1.25 }} component={RouterLink} to="/app/evidence">
                View gaps
              </Button>
            </ModuleCard>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Registered departments (API)
      </Typography>
      <ModuleCard>
        {apiDepts.length === 0 ? (
          <Typography color="text.secondary">No departments returned from API yet.</Typography>
        ) : (
          <Stack spacing={1}>
            {apiDepts.map((d) => (
              <Stack
                key={d.id}
                direction="row"
                justifyContent="space-between"
                sx={{ p: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider' }}
              >
                <Typography fontWeight={600}>{d.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {d.code || d.id}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </ModuleCard>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add department</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
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
