import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { ROLE_META, SELF_REGISTERABLE_ROLES } from '../utils/roles';

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
  return 'Registration failed. Please check your details.';
}

const initialForm = {
  name: '',
  email: '',
  password: '',
  institution_id: '',
  department_id: '',
  role: SELF_REGISTERABLE_ROLES[0],
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        institution_id: form.institution_id.trim(),
        department_id: form.department_id.trim(),
      });
      setSuccess('Account created. You can now sign in with your credentials.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 3 },
        background: `
          linear-gradient(160deg, #F7FAF9 0%, #E8F0EF 55%, #F7EFE4 100%),
          radial-gradient(circle at 15% 20%, rgba(11, 79, 92, 0.08), transparent 40%)
        `,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 560,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 18px 50px rgba(11, 79, 92, 0.08)',
        }}
      >
        <Typography
          variant="overline"
          sx={{ letterSpacing: 1.5, color: 'secondary.main', fontWeight: 700 }}
        >
          Self-registration
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Join as Faculty or Contributor
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Only <strong>Faculty</strong> and <strong>Department Contributor</strong> can
          self-register. IQAC, Reviewer, Approver, and Admin accounts are created by
          administrators.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full name"
              value={form.name}
              onChange={updateField('name')}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              required
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={updateField('password')}
              required
              helperText="Minimum 8 characters"
              inputProps={{ minLength: 8 }}
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={updateField('role')}
              required
            >
              {SELF_REGISTERABLE_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {ROLE_META[role].label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Institution ID"
              value={form.institution_id}
              onChange={updateField('institution_id')}
              required
              helperText="UUID of your institution (from your admin)"
            />
            <TextField
              label="Department ID"
              value={form.department_id}
              onChange={updateField('department_id')}
              required
              helperText="UUID of your department (required for self-registration)"
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" fontWeight={600} color="primary">
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
