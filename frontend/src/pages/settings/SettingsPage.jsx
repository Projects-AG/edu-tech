import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import { getInstitution, listAcademicYears } from '../../api/platform';
import { useAuth } from '../../context/AuthContext';
import { ROLE_META } from '../../utils/roles';

export default function SettingsPage() {
  const { user, roles, activeRole, switchRole } = useAuth();
  const [institution, setInstitution] = useState(null);
  const [years, setYears] = useState([]);
  const [cycle, setCycle] = useState('2024-25');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.institution_id) return;
      try {
        const [inst, ay] = await Promise.all([
          getInstitution(user.institution_id),
          listAcademicYears(user.institution_id),
        ]);
        if (!cancelled) {
          setInstitution(inst);
          setYears(ay);
        }
      } catch {
        if (!cancelled) {
          setInstitution(null);
          setYears([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.institution_id]);

  return (
    <Box>
      <PageHeader
        title="Settings"
        subtitle="Profile, active role, cycle selection, and institution basics"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Settings' }]}
      />

      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <ModuleCard>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Profile
          </Typography>
          <Stack spacing={1.25}>
            <TextField label="Name" value={user?.name || ''} InputProps={{ readOnly: true }} />
            <TextField label="Email" value={user?.email || ''} InputProps={{ readOnly: true }} />
            <TextField
              label="Password"
              type="password"
              value="********"
              helperText="Password change API will be added later."
              InputProps={{ readOnly: true }}
            />
          </Stack>
        </ModuleCard>

        <ModuleCard>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Active role
          </Typography>
          <TextField
            select
            label="Working as"
            value={activeRole || ''}
            onChange={(e) => switchRole(e.target.value)}
          >
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_META[r]?.label || r}
              </MenuItem>
            ))}
          </TextField>
        </ModuleCard>

        <ModuleCard>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Cycle / Academic year
          </Typography>
          <TextField select label="Current cycle" value={cycle} onChange={(e) => setCycle(e.target.value)} sx={{ mb: 1.5 }}>
            <MenuItem value="2024-25">NAAC Cycle IV (2024-25)</MenuItem>
            <MenuItem value="2023-24">Previous cycle (2023-24)</MenuItem>
            {years.map((y) => (
              <MenuItem key={y.id} value={y.label || y.name || y.id}>
                {y.label || y.name || y.id}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={() => setMessage(`Active cycle set to ${cycle} (local preference for now).`)}
          >
            Save preference
          </Button>
          {message ? (
            <Alert severity="success" sx={{ mt: 1.5 }}>
              {message}
            </Alert>
          ) : null}
        </ModuleCard>

        <ModuleCard>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Institution branding
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {institution?.name || 'Institution details load from API when available.'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
            ID: {user?.institution_id || '—'}
          </Typography>
        </ModuleCard>
      </Stack>
    </Box>
  );
}
